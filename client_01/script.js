const addButton = document.getElementById('add-text-btn');
const container = document.getElementById('text-container');

addButton.addEventListener('click', () => {
	const newParagraph = document.createElement('p');
	newParagraph.textContent = 'Новий абзац тексту';
	container.appendChild(newParagraph);
});

const explanationToggle = document.getElementById('explanation-toggle');
const explanationText = document.getElementById('explanation-text');

explanationToggle.addEventListener('click', () => {
	if (explanationText.style.display === 'none') {
		explanationText.style.display = 'block';
		explanationToggle.textContent = 'Сховати пояснення';
	} else {
		explanationText.style.display = 'none';
		explanationToggle.textContent = 'Показати пояснення';
	}
});
