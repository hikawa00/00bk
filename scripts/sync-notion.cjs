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

function blocksToHtml(blocks) {
  const html = [];
  let listType = null; // "ul" or "ol"

  function closeList() {
    if (listType) {
      html.push(`</${listType}>`);
      listType = null;
    }
  }

  for (const block of blocks) {
    const { type } = block;
    const data = block[type];

    if (!data) continue;

    if (type === "paragraph") {
      const text = renderRichTextArray(data.rich_text);
      if (text) {
        closeList();
        html.push(`<p>${text}</p>`);
      }
      continue;
    }

    if (type === "heading_1" || type === "heading_2" || type === "heading_3") {
      const level = type === "heading_1" ? 1 : type === "heading_2" ? 2 : 3;
      const text = renderRichTextArray(data.rich_text);
      if (text) {
        closeList();
        html.push(`<h${level}>${text}</h${level}>`);
      }
      continue;
    }

    if (type === "bulleted_list_item" || type === "numbered_list_item") {
      const desired =
        type === "bulleted_list_item" ? "ul" : "ol";
      if (listType && listType !== desired) {
        closeList();
      }
      if (!listType) {
        listType = desired;
        html.push(`<${listType}>`);
      }
      const text = renderRichTextArray(data.rich_text);
      html.push(`<li>${text}</li>`);
      continue;
    }

    if (type === "quote") {
      const text = renderRichTextArray(data.rich_text);
      if (text) {
        closeList();
        html.push(`<blockquote>${text}</blockquote>`);
      }
      continue;
    }

    if (type === "code") {
      const text = renderRichTextArray(data.rich_text);
      const lang = data.language || "";
      closeList();
      html.push(
        `<pre><code class="language-${escapeHtml(lang)}">${text}</code></pre>`
      );
      continue;
    }

    if (type === "divider") {
      closeList();
      html.push("<hr />");
      continue;
    }

    // 其他类型简单降级为段落
    const fallback = renderRichTextArray(data.rich_text || []);
    if (fallback) {
      closeList();
      html.push(`<p>${fallback}</p>`);
    }
  }

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

    const blocks = await fetchBlocks(page.id);
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

