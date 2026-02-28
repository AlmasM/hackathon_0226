import "./style.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (app) {
  app.innerHTML = `
    <main>
      <h1>TypeScript Frontend</h1>
      <p>Vercel-ready frontend is running.</p>
      <p>Backend endpoint: <code>/api</code></p>
    </main>
  `;
}
