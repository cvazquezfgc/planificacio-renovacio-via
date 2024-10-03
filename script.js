async function loadData(url) {
    console.log(`Cargando datos desde: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error HTTP! Estado: ${response.status}`);
        }
        const data = await response.json();
        console.log(`Datos cargados exitosamente desde: ${url}`);
        return data;
    } catch (error) {
        console.error(`Error cargando datos de ${url}:`, error);
        return null;
    }
}

async function init() {
    console.log('Inicializando la aplicación...');
    const resumUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/resum.json';
    const resumData = await loadData(resumUrl);
    if (!resumData) {
        console.error('No se pudo cargar el resumen de datos.');
        return;
    }

    // Verificar los datos cargados
    console.log('Datos del resumen:', resumData);

    // Obtener los tramos únicos
    const trams = [...new Set(resumData.map(d => d.TRAM))];
    if (trams.length === 0) {
        console.error('No se encontraron tramos en los datos cargados.');
        return;
    }

    console.log('Tramos encontrados:', trams);

    // Contenedor de botones de tramo
    const tramButtonsContainer = document.getElementById('tramButtons');

    // Añadir el botón para "LINIA COMPLETA"
    const liniaCompletaButton = document.createElement('button');
    liniaCompletaButton.className = 'tram-button';
    liniaCompletaButton.textContent = 'LINIA COMPLETA';
    liniaCompletaButton.addEventListener('click', () => {
        selectTramButton(liniaCompletaButton);
        console.log('Botón "LINIA COMPLETA" clickeado');
    });
    tramButtonsContainer.appendChild(liniaCompletaButton);

    // Añadir botones para cada tramo
    trams.forEach(tram => {
        if (tram) {
            const button = document.createElement('button');
            button.className = 'tram-button';
            button.textContent = tram;
            button.addEventListener('click', () => {
                selectTramButton(button);
                console.log(`Botón de tramo "${tram}" clickeado`);
            });
            tramButtonsContainer.appendChild(button);
        }
    });

    console.log('Botones de tramos añadidos correctamente.');
}

function selectTramButton(button) {
    // Deseleccionar todos los botones
    document.querySelectorAll('.tram-button').forEach(btn => btn.classList.remove('selected'));
    // Marcar el botón seleccionado
    button.classList.add('selected');
    console.log(`Botón seleccionado: ${button.textContent}`);
}

// Inicializar la página y los eventos
document.addEventListener('DOMContentLoaded', () => {
    console.log('Contenido DOM cargado, iniciando script...');
    init();
});
