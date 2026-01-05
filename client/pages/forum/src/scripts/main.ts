import { listPosts, getPost, createPost, createComment, getCurrentUserName, deletePost, deleteComentary } from "./api.ts";
import "../scss/main.scss";
import { formatToHtml } from "../../../../src/scripts/engine/utils.ts";

const postsListEl = document.getElementById("posts-list")!;
const postView = document.getElementById("post-view")!;
const createPostSection = document.getElementById("create-post-section")!;
const newPostBtn = document.getElementById("new-post-btn")! as HTMLButtonElement;
const createPostBtn = document.getElementById("create-post")!;
const cancelCreatePostBtn = document.getElementById("cancel-create-post")!;
async function renderPost(post: any, comments: any[]) {
  const currentUser = await getCurrentUserName();

  comments = Array.isArray(comments) ? comments : [];
  postView.innerHTML = `
    <h2 class="text">${post.title || "Untitled"}</h2>
    <div class="meta">by ${`<a href="/pages/user/?user=${post.author}">${post.author}</a>` || "Unknow"} • ${post.created_at || ""}</div>
    <div class="post-body">${formatToHtml(post.body || "")}</div>
    ${post.author === currentUser ? `<button id="delete-post" class="delete-post btn-red">Delete Post</button>` : ""}
    <div class="comments"><h3>Comments</h3>${
      comments.map(c => `
        <div class="comment">
          <div class="meta">${`<a href="/pages/user/?user=${c.author}">${c.author}</a>` || "Anonimous"} • ${c.created_at || ""} 
          ${c.author === currentUser ? `<button data-id="${c.id}" class="delete-comment btn-red">Delete</button>` : ""}
          </div>
          <div>${formatToHtml(c.body || "")}</div>
        </div>
      `).join("")
    }</div>
    <div class="comment-form">
      <textarea id="comment-body" class="text-input" placeholder="Write a comment"></textarea>
      <button id="send-comment" class="btn-green" data-id="${post.id}">Send</button>
    </div>
  `;

  document.getElementById("send-comment")!.addEventListener("click", async () => {
    const body = (document.getElementById("comment-body") as HTMLTextAreaElement).value;
    await createComment(post.id, body);
    await refreshPosts();
    const data = await getPost(post.id);
    renderPost(data.post, data.comments);
  });

  if (post.author === currentUser) {
    document.getElementById("delete-post")!.addEventListener("click", async () => {
      if (confirm("Are you sure you want to delete this post? This action cannot be undone.")) {
        await deletePost(post)
        await refreshPosts();
        postView.innerHTML = "Post deleted.";
      }
    });
  }
  document.querySelectorAll(".delete-comment").forEach(btn => {
    btn.addEventListener("click", async (e) => {
      const id = (e.currentTarget as HTMLElement).getAttribute("data-id");
      if (!id) return;
      if (confirm("Are you sure you want to delete this comment? This action cannot be undone.")) {
        await deleteComentary(id)
        await refreshPosts();
        const data = await getPost(post.id);
        renderPost(data.post, data.comments);
      }
    });
  });
}
function showCreatePostForm() {
    createPostSection.classList.remove("hidden");
    postView.style.display = "none";
    newPostBtn.disabled = true;
  }

  function hideCreatePostForm() {
    createPostSection.classList.add("hidden");
    postView.style.display = "block";
    newPostBtn.disabled = false;
    (document.getElementById("post-title") as HTMLInputElement).value = "";
    (document.getElementById("post-body") as HTMLTextAreaElement).value = "";
  }

  async function refreshPosts() {
    const posts = await listPosts(50, 0);
    postsListEl.innerHTML = posts.map((p: any) =>
      `<div class="post-item" data-id="${p.id}">
          <b>${p.title}</b>
          <div class="meta"><a href="/user/?user=${p.author}">${p.author}</a> • ${p.created_at}</div>
       </div>`
    ).join("");
    postsListEl.querySelectorAll(".post-item").forEach(el => {
      el.addEventListener("click", async () => {
        const id = Number(el.getAttribute("data-id"));
        const data = await getPost(id);
        renderPost(data.post, data.comments);
        hideCreatePostForm();
      });
    });
  }
  newPostBtn.addEventListener("click", () => {
    showCreatePostForm();
  });

  cancelCreatePostBtn.addEventListener("click", () => {
    hideCreatePostForm();
  });

  createPostBtn.addEventListener("click", async () => {
    const title = (document.getElementById("post-title") as HTMLInputElement).value;
    const body = (document.getElementById("post-body") as HTMLTextAreaElement).value;
    await createPost(title, body);
    await refreshPosts();
    hideCreatePostForm();
    postView.innerHTML = "<p>Created. Select the post from the list.</p>";
  });
async function mount() {
  await refreshPosts();
}

mount();
