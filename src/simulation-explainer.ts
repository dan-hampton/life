// Simple modal for Simulation explainer
export function createSimulationExplainerButton() {
  // Create button
  const button = document.createElement('button');
  button.textContent = 'Simulation Explainer';
  button.style.position = 'fixed';
  button.style.bottom = '20px';
  button.style.right = '20px';
  button.style.zIndex = '1000';
  button.style.padding = '10px 18px';
  button.style.background = '#222';
  button.style.color = '#fff';
  button.style.border = 'none';
  button.style.borderRadius = '6px';
  button.style.cursor = 'pointer';
  button.style.fontSize = '1rem';

  // Create modal
  const modal = document.createElement('div');
  modal.style.display = 'none';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.background = 'rgba(0,0,0,0.5)';
  modal.style.zIndex = '1001';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';

  // Modal content
  const content = document.createElement('div');
  content.style.background = '#fff';
  content.style.color = '#222';
  content.style.padding = '28px 32px';
  content.style.borderRadius = '10px';
  content.style.maxWidth = '400px';
  content.style.margin = 'auto';
  content.style.boxShadow = '0 4px 24px rgba(0,0,0,0.18)';
  content.innerHTML = `
    <h2 style="margin-top:0">Game of Life Rules</h2>
    <ul style="padding-left:1.2em">
      <li>Any live cell with 2 or 3 live neighbors survives.</li>
      <li>Any dead cell with exactly 3 live neighbors becomes alive.</li>
      <li>All other live cells die in the next generation.</li>
      <li>All other dead cells stay dead.</li>
    </ul>
    <button id="close-sim-explainer" style="margin-top:18px;padding:6px 16px;background:#222;color:#fff;border:none;border-radius:4px;cursor:pointer;">Close</button>
  `;

  modal.appendChild(content);
  document.body.appendChild(button);
  document.body.appendChild(modal);

  button.onclick = () => {
    modal.style.display = 'flex';
  };
  content.querySelector('#close-sim-explainer')?.addEventListener('click', () => {
    modal.style.display = 'none';
  });
}
