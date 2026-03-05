const fs = require("fs");
const path = require("path");
const { Client } = require("@notionhq/client");

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

if (!NOTION_TOKEN || !DATABASE_ID) {
  console.error("NOTION_TOKEN 或 NOTION_DATABASE_ID 未设置为环境变量。");
  process.exit(1);
}

const notion = new Client({ auth: NOTION_TOKEN });

function slugify(title, fallback) {
  if (!title) return fallback;
  const base = title
    .toString()
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
  return base || fallback;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderRichTextArray(rts) {
  if (!Array.isArray(rts)) return "";
  return rts
    .map((rt) => {
      const text = escapeHtml(rt.plain_text || "");
      const ann = rt.annotations || {};
      let inner = text;
      if (ann.code) inner = `<code>${inner}</code>`;
      if (ann.italic) inner = `<em>${inner}</em>`;
      if (ann.bold) inner = `<strong>${inner}</strong>`;
      if (rt.href) {
        inner = `<a href="${rt.href}" target="_blank" rel="noopener noreferrer">${inner}</a>`;
      }
      return inner;
    })
    .join("");
}

async function fetchAllPages(databaseId) {
  const pages = [];
  let cursor;
  while (true) {
    const response = await notion.databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      filter: {
        property: "Status",
        select: { equals: "Published" },
      },
      sorts: [
        {
          property: "Date",
          direction: "descending",
        },
      ],
    });
    pages.push(...response.results);
    if (!response.has_more) break;
    cursor = response.next_cursor;
  }
  return pages;
}

async function fetchBlocks(blockId) {
  const blocks = [];
  let cursor;
  while (true) {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
    });
    blocks.push(...response.results);
    if (!response.has_more) break;
    cursor = response.next_cursor;
  }
  return blocks;
}

/** 递归拉取块及其子块，按文档顺序返回扁平列表（解决栏目/折叠块内图片同步不到的问题）
 *  同时在 block 上打：
 *    - _depth: 嵌套层级，用于列表/表格等的缩进渲染
 *    - _parentId: 父块 id，用于把 table_row 等块归到对应 table 下
 */
async function fetchAllBlocksRecursive(blockId, depth = 0, parentId = null) {
  const top = await fetchBlocks(blockId);
  const result = [];
  for (const block of top) {
    block._depth = depth;
    block._parentId = parentId;
    result.push(block);
    if (block.has_children) {
      const children = await fetchAllBlocksRecursive(
        block.id,
        depth + 1,
        block.id
      );
      result.push(...children);
    }
  }
  return result;
}

function blocksToHtml(blocks) {
  const html = [];
  let listType = null; // "ul" or "ol"

  // 计算当前文档中列表块的最小嵌套层级，作为 0 级基线
  const listBaseDepth = (() => {
    if (!Array.isArray(blocks) || !blocks.length) return 0;
    const depths = blocks
      .filter(
        (b) =>
          b &&
          (b.type === "bulleted_list_item" || b.type === "numbered_list_item")
      )
      .map((b) => (typeof b._depth === "number" ? b._depth : 0));
    if (!depths.length) return 0;
    return Math.min(...depths);
  })();

  // 表格渲染状态（Notion table + table_row）
  let inTable = false;
  let currentTableId = null;
  let tableHasColumnHeader = false;
  let tableHasRowHeader = false;
  let tableRowIndex = 0;

  function closeTable() {
    if (inTable) {
      html.push(`</tbody></table></div>`);
      inTable = false;
      currentTableId = null;
      tableHasColumnHeader = false;
      tableHasRowHeader = false;
      tableRowIndex = 0;
    }
  }

  function closeList() {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  }

  for (const block of blocks) {
    const { type } = block;
    const data = block[type];

    // 如果当前在表格里，但遇到了不属于当前表格的块，则先把表格闭合
    if (
      inTable &&
      (type !== "table_row" || block._parentId !== currentTableId)
    ) {
      closeTable();
    }

    if (!data) continue;

    // Notion 表格本体（结构信息）
    if (type === "table") {
      const tableData = data;
      closeList();
      closeTable();

      inTable = true;
      currentTableId = block.id;
      tableHasColumnHeader = !!tableData.has_column_header;
      tableHasRowHeader = !!tableData.has_row_header;
      tableRowIndex = 0;

      html.push(
        `<div class="notion-table-wrapper"><table class="notion-table"><tbody>`
      );
      continue;
    }

    // Notion 表格行
    if (type === "table_row") {
      const rowData = data;
      const cells = rowData.cells || [];

      // 理论上 table_row 一定有父 table；如果没命中，就临时开一个表格包起来
      if (!inTable) {
        closeList();
        inTable = true;
        currentTableId = block._parentId || null;
        tableHasColumnHeader = false;
        tableHasRowHeader = false;
        tableRowIndex = 0;
        html.push(
          `<div class="notion-table-wrapper"><table class="notion-table"><tbody>`
        );
      }

      const isHeaderRow = tableHasColumnHeader && tableRowIndex === 0;

      const rowHtml = cells
        .map((cell, idx) => {
          const content = renderRichTextArray(cell || []);
          let tag = "td";
          let extraAttr = "";

          if (isHeaderRow) {
            tag = "th";
            extraAttr = ' scope="col"';
          } else if (tableHasRowHeader && idx === 0) {
            tag = "th";
            extraAttr = ' scope="row"';
          }

          return `<${tag}${extraAttr}>${content}</${tag}>`;
        })
        .join("");

      html.push(`<tr>${rowHtml}</tr>`);
      tableRowIndex += 1;
      continue;
    }

    if (type === "paragraph") {
      const text = renderRichTextArray(data.rich_text);
      if (text) {
        closeList();
        closeTable();
        html.push(`<p>${text}</p>`);
      } else {
        // Notion 里的纯空段落，用一个空行占位，避免被完全吞掉
        closeList();
        closeTable();
        html.push(`<p class="empty-line">&nbsp;</p>`);
      }
      continue;
    }

    if (type === "heading_1" || type === "heading_2" || type === "heading_3") {
      const level = type === "heading_1" ? 1 : type === "heading_2" ? 2 : 3;
      const text = renderRichTextArray(data.rich_text);
      if (text) {
        closeList();
        closeTable();
        html.push(`<h${level}>${text}</h${level}>`);
      }
      continue;
    }

    if (type === "bulleted_list_item" || type === "numbered_list_item") {
      const desired = type === "bulleted_list_item" ? "ul" : "ol";
      if (listType && listType !== desired) {
        closeList();
      }
      if (!listType) {
        closeTable();
        listType = desired;
        html.push(`<${listType}>`);
      }
      const text = renderRichTextArray(data.rich_text);
      const depth =
        typeof block._depth === "number" ? block._depth : listBaseDepth;
      const level = Math.max(0, depth - listBaseDepth);
      const levelClass = level > 0 ? ` class="list-level-${level}"` : "";
      html.push(`<li${levelClass}>${text}</li>`);
      continue;
    }

    if (type === "quote") {
      const text = renderRichTextArray(data.rich_text);
      if (text) {
        closeList();
        closeTable();
        html.push(`<blockquote>${text}</blockquote>`);
      }
      continue;
    }

    if (type === "code") {
      const text = renderRichTextArray(data.rich_text);
      const lang = data.language || "";
      closeList();
      closeTable();
      html.push(
        `<pre><code class="language-${escapeHtml(lang)}">${text}</code></pre>`
      );
      continue;
    }

    if (type === "divider") {
      closeList();
      closeTable();
      html.push("<hr />");
      continue;
    }

    if (type === "image") {
      const img = data;
      const url =
        img.external?.url || img.file?.url || "";
      const caption = renderRichTextArray(img.caption || []);
      if (url) {
        closeList();
        closeTable();
        const cap = caption ? `<figcaption>${caption}</figcaption>` : "";
        html.push(`<figure><img src="${escapeHtml(url)}" alt="${escapeHtml(caption)}" loading="lazy" />${cap}</figure>`);
      }
      continue;
    }

    // 链接/嵌入：Notion 有时会把「图片链接」存成 embed/bookmark，这里统一当图片或链接输出
    if (type === "embed" || type === "bookmark") {
      const info = data;
      const url = info.url || "";
      if (url) {
        closeList();
        closeTable();
        const isImageUrl = /\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(url) ||
          /(imgur|unsplash|img\.bb|cdn\.|cloudinary)/i.test(url);
        if (isImageUrl) {
          html.push(`<figure><img src="${escapeHtml(url)}" alt="" loading="lazy" /></figure>`);
        } else {
          const caption = type === "bookmark"
            ? renderRichTextArray(info.caption || []) || "打开链接"
            : "打开链接";
          html.push(`<p><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${caption}</a></p>`);
        }
      }
      continue;
    }

    // 其他类型简单降级为段落
    const fallback = renderRichTextArray(data.rich_text || []);
    if (fallback) {
      closeList();
      closeTable();
      html.push(`<p>${fallback}</p>`);
    }
  }

  closeTable();
  closeList();
  return html.join("\n");
}

async function buildPosts() {
  console.log("从 Notion 同步文章...");
  const pages = await fetchAllPages(DATABASE_ID);
  console.log(`从数据库读取到 ${pages.length} 条已发布页面。`);

  const posts = [];

  for (const page of pages) {
    const props = page.properties || {};
    const titleProp = props.Title;
    const slugProp = props.Slug;
    const catProp = props.Category;
    const dateProp = props.Date;
    const excerptProp = props.Excerpt;

    const title =
      (titleProp?.title || [])
        .map((t) => t.plain_text)
        .join("") || "未命名文章";

    const rawSlug =
      (slugProp?.rich_text || [])
        .map((t) => t.plain_text)
        .join("") || "";

    const fallbackSlug = page.id.replace(/-/g, "").slice(0, 12);
    const id = slugify(rawSlug || title, fallbackSlug);

    const category = catProp?.select?.name || "学习";
    const date =
      dateProp?.date?.start || page.created_time?.slice(0, 10) || "";

    let excerpt =
      (excerptProp?.rich_text || [])
        .map((t) => t.plain_text)
        .join("") || "";

    const blocks = await fetchAllBlocksRecursive(page.id);
    const contentHtml = blocksToHtml(blocks);

    if (!excerpt) {
      const plain = contentHtml.replace(/<[^>]+>/g, " ");
      excerpt = plain.trim().slice(0, 80) || "";
    }

    posts.push({
      id,
      title,
      date,
      tags: [category],
      excerpt,
      content: contentHtml,
    });
  }

  // 再按日期倒序排一次，保证前端和本地体验一致
  posts.sort((a, b) => (a.date < b.date ? 1 : -1));

  const outPath = path.join(__dirname, "..", "posts.json");
  fs.writeFileSync(outPath, JSON.stringify(posts, null, 2), "utf8");
  console.log(`已写入 ${posts.length} 篇文章到 ${outPath}`);
}

buildPosts().catch((err) => {
  console.error("同步 Notion 失败：", err);
  process.exit(1);
});

