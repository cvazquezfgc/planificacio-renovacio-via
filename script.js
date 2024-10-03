// Función para cargar los datos
async function loadData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Error HTTP! Estado: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error cargando datos de ${url}:`, error);
        return null;
    }
}

// Función para dibujar gráficos concatenados para LINIA COMPLETA
async function drawFullLinePlot(trams, resumData) {
    document.getElementById('plot').innerHTML = `
        <h2 style="text-align: center; font-size: 24px; font-family: Arial, sans-serif;">
            Espai-temps previsió rehabilitació de la línia completa
        </h2>`;

    const estacionsUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/estacions.json';
    const estacionsData = await loadData(estacionsUrl);
    if (!estacionsData) {
        console.error('No se pudo cargar los datos de las estaciones.');
        return;
    }

    let pkMinGlobal = Infinity;
    let pkMaxGlobal = -Infinity;

    // Determinar pkMinGlobal y pkMaxGlobal para mantener la misma escala vertical en todos los gráficos
    trams.forEach(tram => {
        const via1Data = resumData.filter(d => parseInt(d.Via) === 1 && d.TRAM === tram);
        const via2Data = resumData.filter(d => parseInt(d.Via) === 2 && d.TRAM === tram);
        if (via1Data.length > 0 || via2Data.length > 0) {
            const pkMin = Math.min(...via1Data.concat(via2Data).map(d => parseFloat(d['PK inici'])));
            const pkMax = Math.max(...via1Data.concat(via2Data).map(d => parseFloat(d['PK final'])));
            pkMinGlobal = Math.min(pkMin, pkMinGlobal);
            pkMaxGlobal = Math.max(pkMax, pkMaxGlobal);
        }
    });

    // Dibujar los gráficos concatenados de cada tramo
    for (let i = 0; i < trams.length; i++) {
        const tram = trams[i];

        const via1Data = resumData.filter(d => parseInt(d.Via) === 1 && d.TRAM === tram);
        const via2Data = resumData.filter(d => parseInt(d.Via) === 2 && d.TRAM === tram);

        let pkMin = Math.min(...via1Data.concat(via2Data).map(d => parseFloat(d['PK inici'])));
        let pkMax = Math.max(...via1Data.concat(via2Data).map(d => parseFloat(d['PK final'])));

        // Crear un contenedor para cada gráfico
        const container = document.createElement('div');
        container.id = `plot-${tram}`;
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.marginBottom = '10px';

        // Crear un contenedor para la etiqueta del tramo
        const labelContainer = document.createElement('div');
        labelContainer.style.transform = 'rotate(270deg)'; // Cambiar orientación del texto a 270 grados
        labelContainer.style.textAlign = 'center';
        labelContainer.style.marginRight = '10px';
        labelContainer.style.fontSize = '16px';
        labelContainer.style.fontWeight = 'bold';
        labelContainer.textContent = tram;

        // Crear un contenedor para el gráfico
        const plotContainer = document.createElement('div');
        plotContainer.id = `plot-${tram}-chart`;
        plotContainer.style.height = `${(pkMax - pkMin) * 20}px`; // Ajustar la altura proporcional a la longitud
        plotContainer.style.flexGrow = '1';

        // Añadir la etiqueta y el gráfico al contenedor principal
        container.appendChild(labelContainer);
        container.appendChild(plotContainer);

        // Añadir el contenedor del gráfico al área principal de gráficos
        document.getElementById('plot').appendChild(container);

        // Dibujar el gráfico sin título y con etiquetas de año solo en el primero y el último
        const addHorizontalLabels = i === 0 || i === trams.length - 1;
        await drawPlot(tram, resumData, estacionsData, plotContainer.id, addHorizontalLabels, pkMinGlobal, pkMaxGlobal);
    }
}

// Función para dibujar gráficos de tramos individuales y añadir tarjetas informativas
async function drawSinglePlot(tram, resumData) {
    document.getElementById('plot').innerHTML = `<h2 style="text-align: center; font-size: 24px; font-family: Arial, sans-serif;">
        Espai-temps previsió rehabilitació tram ${tram}
    </h2>`;

    const estacionsUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/estacions.json';
    const estacionsData = await loadData(estacionsUrl);
    if (!estacionsData) {
        console.error('No se pudo cargar los datos de las estaciones.');
        return;
    }

    await drawPlot(tram, resumData, estacionsData, 'plot', true, null, null, 600); // Ajustar la altura de los gráficos individuales

    // Añadir las tarjetas informativas
    const totalLength = resumData
        .filter(d => d.TRAM === tram)
        .reduce((sum, d) => sum + (parseFloat(d['PK final']) - parseFloat(d['PK inici'])) * 1000, 0);

    const lengthBefore2025 = resumData
        .filter(d => d.TRAM === tram && parseInt(d['PREVISIÓ REHABILITACIÓ']) < 2025)
        .reduce((sum, d) => sum + (parseFloat(d['PK final']) - parseFloat(d['PK inici'])) * 1000, 0);

    const lengthBetween2025And2030 = resumData
        .filter(d => d.TRAM === tram && parseInt(d['PREVISIÓ REHABILITACIÓ']) >= 2025 && parseInt(d['PREVISIÓ REHABILITACIÓ']) <= 2030)
        .reduce((sum, d) => sum + (parseFloat(d['PK final']) - parseFloat(d['PK inici'])) * 1000, 0);

    const infoContainer = document.createElement('div');
    infoContainer.style.display = 'flex';
    infoContainer.style.gap = '20px';
    infoContainer.style.marginTop = '20px';

    const createCard = (title, value) => {
        const card = document.createElement('div');
        card.style.border = '1px solid #ccc';
        card.style.borderRadius = '8px';
        card.style.padding = '10px';
        card.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';
        card.style.flex = '1';

        const cardTitle = document.createElement('h3');
        cardTitle.textContent = title;
        cardTitle.style.margin = '0 0 10px 0';

        const cardValue = document.createElement('p');
        cardValue.textContent = `${value.toFixed(0)} m`;
        cardValue.style.fontSize = '18px';
        cardValue.style.fontWeight = 'bold';

        card.appendChild(cardTitle);
        card.appendChild(cardValue);

        return card;
    };

    infoContainer.appendChild(createCard('LONGITUD TOTAL DE VIA DEL TRAMO', totalLength));
    infoContainer.appendChild(createCard('LONGITUD TOTAL DE VIA DEL TRAMO CON AÑO DE REHABILITACIÓN < 2025', lengthBefore2025));
    infoContainer.appendChild(createCard('LONGITUD TOTAL DE VIA DEL TRAMO CON AÑO DE REHABILITACIÓN ENTRE 2025 Y 2030', lengthBetween2025And2030));

    document.getElementById('plot').appendChild(infoContainer);

    // Ajustar la altura de la página para que se adapte a la ventana visible
    document.body.style.height = '100vh';
    document.documentElement.style.height = '100vh';
}

// Ejecutar cuando el contenido del DOM esté cargado
document.addEventListener('DOMContentLoaded', () => {
    init();
});
