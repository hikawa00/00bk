function slugifyTitle(title) {
  const base = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  if (base) return base;
  const now = new Date();
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, "0");
  const d = `${now.getDate()}`.padStart(2, "0");
  const t = `${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;
  return `post-${y}${m}${d}-${t}`;
}

function escapeForJsString(str) {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function escapeForTemplate(str) {
  return str.replace(/\\/g, "\\\\").replace(/`/g, "\\`");
}

// 简单编辑密码（只在 editor 页面使用，安全性有限）
const EDITOR_PASSWORD = "hikawa00"; // 建议改成你自己的密码

function ensureEditorAuth() {
  const authed = sessionStorage.getItem("editor-authed") === "1";
  if (authed) return true;

  const pwd = prompt("请输入编辑密码：");
  if (pwd === EDITOR_PASSWORD) {
    sessionStorage.setItem("editor-authed", "1");
    return true;
  }

  if (pwd !== null) {
    alert("密码错误，将返回博客首页。");
  }
  window.location.href = "index.html";
  return false;
}

// 非完整 Markdown 解析器，只支持常见语法：标题、粗体/斜体、列表、段落
function markdownToHtml(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const htmlLines = [];
  let inList = false;

  function closeList() {
    if (inList) {
      htmlLines.push("</ul>");
      inList = false;
    }
  }

  for (let raw of lines) {
    const line = raw.trim();
    if (!line) {
      closeList();
      continue;
    }

    // 标题
    if (/^#{1,6}\s+/.test(line)) {
      closeList();
      const level = Math.min(6, line.match(/^#+/)[0].length);
      const text = line.replace(/^#{1,6}\s+/, "");
      const inner = text
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>");
      htmlLines.push(`<h${level}>${inner}</h${level}>`);
      continue;
    }

    // 无序列表
    if (/^[-*+]\s+/.test(line)) {
      if (!inList) {
        inList = true;
        htmlLines.push("<ul>");
      }
      const itemText = line.replace(/^[-*+]\s+/, "");
      const inner = itemText
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>");
      htmlLines.push(`<li>${inner}</li>`);
      continue;
    }

    // 普通段落
    closeList();
    const inner = line
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>");
    htmlLines.push(`<p>${inner}</p>`);
  }

  closeList();
  return htmlLines.join("\n");
}

function initEditor() {
  const form = document.getElementById("postForm");
  const titleInput = document.getElementById("title");
  const dateInput = document.getElementById("date");
  const idInput = document.getElementById("id");
  const categorySelect = document.getElementById("category");
  const excerptInput = document.getElementById("excerpt");
  const contentInput = document.getElementById("content");
  const output = document.getElementById("codeOutput");
  const formatInputs = document.querySelectorAll('input[name="contentFormat"]');

  // 默认日期：今天
  const today = new Date();
  const y = today.getFullYear();
  const m = `${today.getMonth() + 1}`.padStart(2, "0");
  const d = `${today.getDate()}`.padStart(2, "0");
  dateInput.value = `${y}-${m}-${d}`;

  // 标题失焦时自动生成 ID（如果还没有填）
  titleInput.addEventListener("blur", () => {
    if (!idInput.value.trim() && titleInput.value.trim()) {
      idInput.value = slugifyTitle(titleInput.value);
    }
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();

    const rawTitle = titleInput.value.trim();
    const rawId = idInput.value.trim();
    const id = rawId || slugifyTitle(rawTitle || "post");
    const date = dateInput.value || `${y}-${m}-${d}`;
    const category = categorySelect.value || "学习";
    const excerpt = excerptInput.value.trim();
    const content = contentInput.value;
    const formatRadio = Array.from(formatInputs).find((el) => el.checked);
    const format = formatRadio ? formatRadio.value : "html";

    const safeTitle = escapeForJsString(rawTitle || "未命名文章");
    const safeExcerpt = escapeForJsString(
      excerpt || "这是一篇新文章的摘要，可以在这里补充。"
    );
    const rawContent =
      content ||
      (format === "markdown"
        ? "这里写正文内容。"
        : "<p>这里写正文内容。</p>");

    const htmlContent =
      format === "markdown" ? markdownToHtml(rawContent) : rawContent;

    const safeContent = escapeForTemplate(htmlContent);

    const indentedContent = safeContent
      .split("\n")
      .map((line) => (line ? `      ${line}` : ""))
      .join("\n");

    const snippet = `  {
    id: "${id}",
    title: "${safeTitle}",
    date: "${date}",
    tags: ["${category}"],
    excerpt: "${safeExcerpt}",
    content: \`
${indentedContent}
    \`,
  },`;

    output.value = snippet;
    output.focus();
    output.select();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  if (!ensureEditorAuth()) return;
  initEditor();
});

