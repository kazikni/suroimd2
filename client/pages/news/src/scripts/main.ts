import { formatToHtml } from "../../../../src/scripts/engine/utils.ts";
import { API_BASE } from "../../../../src/scripts/others/config.ts";
import "../scss/main.scss";

const newsListEl = document.querySelector("#news-list")!
const newsPreviewEl = document.querySelector("#news-preview")!

async function init() {
  const news = await fetch(`${API_BASE}/news/get`).then(r => r.json())

  newsListEl.innerHTML = ""

  for (const n of news) {
    const el = document.createElement("h3")
    el.textContent = n.title

    el.onclick = () => {
      newsPreviewEl.innerHTML = `
        ${formatToHtml(n.content)}
        <br><br>
        <a class="see-more" href="/pages/news/?id=${n.id}">
          <button class="btn-blue">See More →</button>
        </a>
      `;
    };

    newsListEl.appendChild(el)
  }
}
init()