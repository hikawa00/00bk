// 固定的五个分类
const CATEGORIES = ["学习", "探索", "欣赏", "创作", "积累"];

const CATEGORY_CLASS_MAP = {
  学习: "tag-learning",
  探索: "tag-explore",
  欣赏: "tag-enjoy",
  创作: "tag-create",
  积累: "tag-accumulate",
};

// 博客示例数据，你可以按格式添加/修改文章
// 如果存在 posts.json，则会在运行时覆盖此数组（作为后备数据）
let posts = [
  {
    id: "hello-blog",
    title: "你好，博客世界",
    date: "2026-03-01",
    tags: ["创作"],
    excerpt: "写博客的第一篇文章，记录一下这个新的开始。",
    content: `
      <p>欢迎来到我的新博客 👋</p>
      <p>
        这里将用来记录我的生活、技术学习笔记，以及一些杂七杂八的想法。
        这篇文章只是一个示例，你可以在 <code>main.js</code> 中修改或删除它。
      </p>
      <h2>我会写些什么？</h2>
      <ul>
        <li>日常随笔：记录生活中的小确幸和小情绪</li>
        <li>技术总结：学习过程中踩过的坑、做过的项目</li>
        <li>阅读观影：看完一本书 / 一部电影后的感想</li>
      </ul>
      <p>希望这个小小的角落，可以慢慢堆积出属于自己的成长轨迹。</p>
    `,
  },
  {
    id: "productivity-notes",
    title: "最近的一些效率习惯",
    date: "2026-02-20",
    tags: ["积累"],
    excerpt: "尝试了几种提升专注度的小方法，简单做个阶段性记录。",
    content: `
      <p>这段时间一直在尝试调整自己的节奏，让生活和工作变得更有序一点。</p>
      <h2>几个对我有用的小习惯</h2>
      <ol>
        <li><strong>番茄工作法</strong>：25 分钟专注 + 5 分钟休息，简单但很管用。</li>
        <li><strong>每天只列 3 件最重要的事</strong>：避免无穷无尽的 to-do 压力。</li>
        <li><strong>碎片时间做轻任务</strong>：比如整理文件、删邮件，而不是开始新的重任务。</li>
      </ol>
      <p>这些习惯不是万能药，但确实帮我减少了“忙了一整天却不知道自己在干嘛”的感觉。</p>
    `,
  },
  {
    id: "tech-note-frontend",
    title: "简单记录：前端学习里的几个关键点",
    date: "2026-01-15",
    tags: ["学习"],
    excerpt: "把最近学到的几个前端知识点，用自己的语言梳理一下。",
    content: `
      <p>前端这条路越走越深，越发觉得基础很重要。</p>
      <h2>最近反复遇到的几个关键词</h2>
      <ul>
        <li><strong>组件化思维</strong>：把页面拆成一个个可复用的小积木。</li>
        <li><strong>状态管理</strong>：数据从哪里来、往哪里去，要想清楚。</li>
        <li><strong>用户体验</strong>：不仅是“能用”，而是“好用、顺手、舒服”。</li>
      </ul>
      <p>以后可以逐渐把这些点写成更系统的笔记。</p>
    `,
  },
  {
    id: "vibe-coding",
    title: "vibe coding测试中",
    date: "2026-03-01",
    tags: ["探索"],
    excerpt: "我就是想试试这个editor",
    content: `
      <h2>你好，世界（我是中国人说中文）</h2>
      真的管用吗。。。
    `,
  },
  {
    id: "editor",
    title: "editor测试",
    date: "2026-03-01",
    tags: ["探索"],
    excerpt: "这是一篇新文章的摘要，可以在这里补充。",
    content: `
      <h2>这个是md的试验</h2>
      <p><em>我还不太会用</em>，先试试</p>
    `,
  },
  {
    id: "post-20260301-235749",
    title: "今天到此为止",
    date: "2026-03-01",
    tags: ["学习"],
    excerpt: "vibe coding，建站，部署，域名...一晚的“你好，世界”",
    content: `
      <h1>终于有了博客。。。吗</h1>
      <p>其实又已经过了0点了，算第二天</p>
      <p>今天/昨天做了一些事：</p>
      <ul>
      <li>打开<strong>siao</strong> mark的80岁老太vibe coding教程，发现自己不知什么时候已经安装了cursor</li>
      <li>一句+几句修改让cursor帮我完成了建站前端三件套代码</li>
      <li>学习（复习？）github仓库pages的静态部署</li>
      <li>deepseek辅助下买+接域名（hikawa00.top）</li>
      </ul>
      <p>> 题外话：遥想当（去）年在wordpress和naclo的建站尝试，也是因为.top当年+续费最便宜买的，如今仍旧惜财穷鬼中...</p>
      <ul>
      <li>接editor功能，支持html和md，虽然依旧十分脱裤子放屁，但是先挂着</li>
      <li>归来半生仍记不住markdown语法，简单学习后编辑此页面</li>
      </ul>
      <p>也算是简短的圆了博客梦吗（什么”宝可“梦），当时一直说要搞，拖拖拖也没弄，结果是因为vibe coding哈哈</p>
      <p>也不知道后面有没有心思继续经营，其实渴望的功能还不少，测试一下cursor实例</p>
      <p>比如editor应该加一个md效果实时显示...</p>
    `,
  },
];

// DOM 元素
const postListEl = document.getElementById("postList");
const postCountEl = document.getElementById("postCount");
const listViewEl = document.getElementById("listView");
const detailViewEl = document.getElementById("detailView");
const introViewEl = document.getElementById("introView");
const detailTitleEl = document.getElementById("detailTitle");
const detailDateEl = document.getElementById("detailDate");
const detailTagsEl = document.getElementById("detailTags");
const detailContentEl = document.getElementById("detailContent");
const backToListBtn = document.getElementById("backToList");
const searchInputEl = document.getElementById("searchInput");
const tagListEl = document.getElementById("tagList");
const footerYearEl = document.getElementById("footerYear");
const navPostsBtn = document.getElementById("navPosts");
const navAboutBtn = document.getElementById("navAbout");

let activeTag = null;
let searchKeyword = "";

function formatDate(dateStr) {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getAllTags() {
  return CATEGORIES;
}

function renderTags() {
  const allTags = getAllTags();
  tagListEl.innerHTML = "";

  if (!allTags.length) {
    tagListEl.textContent = "暂时还没有标签";
    return;
  }

  allTags.forEach((tag) => {
    const btn = document.createElement("button");
    btn.textContent = tag;
    const extraClass = CATEGORY_CLASS_MAP[tag] || "";
    btn.className =
      "tag-pill " +
      extraClass +
      (activeTag === tag ? " active" : "");
    btn.addEventListener("click", () => {
      activeTag = activeTag === tag ? null : tag;
      renderTags();
      renderPosts();
      // 无论当前是否在「关于我」，点击分类后都切回文章列表视图
      if (window.location.hash === "#about") {
        window.location.hash = "";
      }
    });
    tagListEl.appendChild(btn);
  });
}

function filterPosts() {
  return posts
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .filter((post) => {
      if (activeTag && !(post.tags || []).includes(activeTag)) {
        return false;
      }
      if (!searchKeyword) return true;
      const keyword = searchKeyword.toLowerCase();
      const text =
        `${post.title} ${post.excerpt} ${post.content}`
          .replace(/<[^>]+>/g, " ")
          .toLowerCase();
      return text.includes(keyword);
    });
}

function renderPosts() {
  const list = filterPosts();
  postListEl.innerHTML = "";

  postCountEl.textContent = `共 ${list.length} 篇文章`;

  if (!list.length) {
    const empty = document.createElement("div");
    empty.className = "no-result";
    empty.textContent = "没有找到匹配的文章，可以试试清空搜索或取消标签筛选。";
    postListEl.appendChild(empty);
    return;
  }

  list.forEach((post) => {
    const card = document.createElement("article");
    card.className = "post-card";
    card.addEventListener("click", () => {
      window.location.hash = `#post=${encodeURIComponent(post.id)}`;
    });

    const title = document.createElement("h2");
    title.className = "post-card-title";
    title.textContent = post.title;

    const meta = document.createElement("div");
    meta.className = "post-card-meta";
    const dateSpan = document.createElement("span");
    dateSpan.textContent = formatDate(post.date);

    const tagsSpan = document.createElement("span");
    tagsSpan.textContent = (post.tags || []).join(" / ");

    meta.appendChild(dateSpan);
    if (tagsSpan.textContent) {
      const dot = document.createElement("span");
      dot.className = "post-card-meta-dot";
      meta.appendChild(dot);
      meta.appendChild(tagsSpan);
    }

    const excerpt = document.createElement("p");
    excerpt.className = "post-card-excerpt";
    excerpt.textContent = post.excerpt;

    card.appendChild(title);
    card.appendChild(meta);
    card.appendChild(excerpt);

    postListEl.appendChild(card);
  });
}

function showPostDetail(id) {
  const post = posts.find((p) => p.id === id);
  if (!post) return;

  detailTitleEl.textContent = post.title;
  detailDateEl.textContent = formatDate(post.date);
  detailTagsEl.innerHTML = "";

  (post.tags || []).forEach((tag) => {
    const span = document.createElement("span");
    const extraClass = CATEGORY_CLASS_MAP[tag] || "";
    span.className = `post-tag ${extraClass}`.trim();
    span.textContent = tag;
    detailTagsEl.appendChild(span);
  });

  detailContentEl.innerHTML = post.content;

  introViewEl.classList.remove("view-active");
  introViewEl.classList.add("view-hidden");
  listViewEl.classList.remove("view-active");
  listViewEl.classList.add("view-hidden");
  detailViewEl.classList.remove("view-hidden");
  detailViewEl.classList.add("view-active");

  navPostsBtn.classList.add("nav-tab-active");
  navAboutBtn.classList.remove("nav-tab-active");
}

function backToList() {
  window.location.hash = "";
}

function showIntro() {
  detailViewEl.classList.remove("view-active");
  detailViewEl.classList.add("view-hidden");
  listViewEl.classList.remove("view-active");
  listViewEl.classList.add("view-hidden");
  introViewEl.classList.remove("view-hidden");
  introViewEl.classList.add("view-active");

  navPostsBtn.classList.remove("nav-tab-active");
  navAboutBtn.classList.add("nav-tab-active");
}

function showList() {
  detailViewEl.classList.remove("view-active");
  detailViewEl.classList.add("view-hidden");
  introViewEl.classList.remove("view-active");
  introViewEl.classList.add("view-hidden");
  listViewEl.classList.remove("view-hidden");
  listViewEl.classList.add("view-active");

  navPostsBtn.classList.add("nav-tab-active");
  navAboutBtn.classList.remove("nav-tab-active");
}

function handleHashChange() {
  const hash = window.location.hash;
  if (hash === "#about") {
    showIntro();
    return;
  }

  const match = hash.match(/#post=([^&]+)/);
  if (match) {
    const id = decodeURIComponent(match[1]);
    showPostDetail(id);
    return;
  }

  showList();
}

async function loadRemotePosts() {
  try {
    const res = await fetch("posts.json", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data) && data.length) {
      posts = data;
    }
  } catch (err) {
    console.error("加载 posts.json 失败，将使用内置示例文章。", err);
  }
}

async function init() {
  footerYearEl.textContent = new Date().getFullYear();
  await loadRemotePosts();
  renderTags();
  renderPosts();
  handleHashChange();

  backToListBtn.addEventListener("click", backToList);
  window.addEventListener("hashchange", handleHashChange);

  searchInputEl.addEventListener("input", (e) => {
    searchKeyword = e.target.value.trim();
    renderPosts();
  });

  if (navPostsBtn && navAboutBtn) {
    navPostsBtn.addEventListener("click", () => {
      window.location.hash = "";
    });
    navAboutBtn.addEventListener("click", () => {
      window.location.hash = "#about";
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  init();
});

