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
    document.getElementById('plot').innerHTML = '<h2 style="text-align: center; font-size: 24px; font-family: Arial, sans-serif;">Espai-temps previsió rehabilitació de la línia completa</h2>';

    const estacionsUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/estacions.json';
    const estacionsData = await loadData(estacionsUrl);
    if (!estacionsData) {
        console.error('No se pudo cargar los datos de las estaciones.');
        return;
    }

    let pkMinGlobal = Infinity;
    let pkMaxGlobal = -Infinity;
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

    for (let i = 0; i < trams.length; i++) {
        const tram = trams[i];

        const container = document.createElement('div');
        container.id = `plot-${tram}`;
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.marginBottom = '20px';

        const labelContainer = document.createElement('div');
        labelContainer.style.writingMode = 'vertical-rl';
        labelContainer.style.transform = 'rotate(270deg)';
        labelContainer.style.textAlign = 'center';
        labelContainer.style.marginRight = '10px';
        labelContainer.style.fontSize = '16px';
        labelContainer.style.fontWeight = 'bold';
        labelContainer.textContent = tram;

        const plotContainer = document.createElement('div');
        plotContainer.id = `plot-${tram}-chart`;
        plotContainer.style.height = `${500 + (pkMaxGlobal - pkMinGlobal) * 10}px`; // Ajustar la altura basada en la longitud total
        plotContainer.style.flexGrow = '1';

        container.appendChild(labelContainer);
        container.appendChild(plotContainer);

        document.getElementById('plot').appendChild(container);

        await drawPlot(tram, resumData, estacionsData, plotContainer.id, i === trams.length - 1, pkMinGlobal, pkMaxGlobal);
    }
}

// Función para dibujar gráficos de tramos individuales y añadir tarjetas informativas
async function drawSinglePlot(tram, resumData) {
    document.getElementById('plot').innerHTML = '';

    const estacionsUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/estacions.json';
    const estacionsData = await loadData(estacionsUrl);
    if (!estacionsData) {
        console.error('No se pudo cargar los datos de las estaciones.');
        return;
    }

    // Crear contenedor para el título del gráfico
    const titleContainer = document.createElement('h2');
    titleContainer.textContent = `Espai-temps previsió rehabilitació tram ${tram}`;
    titleContainer.style.textAlign = 'center';
    titleContainer.style.fontSize = '24px';
    titleContainer.style.fontFamily = 'Arial, sans-serif';
    document.getElementById('plot').appendChild(titleContainer);

    await drawPlot(tram, resumData, estacionsData, 'plot', true, null, null, 600);

    // Añadir la representación esquemática de las líneas del tramo
    const infoContainer = document.createElement('div');
    infoContainer.style.display = 'flex';
    infoContainer.style.flexDirection = 'column';
    infoContainer.style.alignItems = 'center';
    infoContainer.style.marginTop = '20px';

    const lineContainer = document.createElement('div');
    lineContainer.style.position = 'relative';
    lineContainer.style.width = '90%';
    lineContainer.style.height = '50px';

    // Base lines for each track (gray color)
    ['Vía 1', 'Vía 2'].forEach((via, index) => {
        const line = document.createElement('div');
        line.style.position = 'absolute';
        line.style.top = `${index * 25}px`;
        line.style.width = '100%';
        line.style.height = '10px';
        line.style.backgroundColor = '#cccccc'; // Gray color for base line
        line.style.borderRadius = '5px';
        lineContainer.appendChild(line);
    });

    // Highlight segments to renovate before 2025 (red color)
    const segmentsBefore2025 = resumData.filter(d => d.TRAM === tram && parseInt(d['PREVISIÓ REHABILITACIÓ']) < 2025);
    segmentsBefore2025.forEach(segment => {
        const start = (parseFloat(segment['PK inici']) / pkMaxGlobal) * 100;
        const end = (parseFloat(segment['PK final']) / pkMaxGlobal) * 100;
        ['Vía 1', 'Vía 2'].forEach((_, index) => {
            const highlight = document.createElement('div');
            highlight.style.position = 'absolute';
            highlight.style.top = `${index * 25}px`;
            highlight.style.left = `${start}%`;
            highlight.style.width = `${end - start}%`;
            highlight.style.height = '10px';
            highlight.style.backgroundColor = 'red';
            highlight.style.borderRadius = '5px';
            lineContainer.appendChild(highlight);
        });
    });

    // Highlight segments to renovate between 2025 and 2030 (orange color)
    const segments2025to2030 = resumData.filter(d => d.TRAM === tram && parseInt(d['PREVISIÓ REHABILITACIÓ']) >= 2025 && parseInt(d['PREVISIÓ REHABILITACIÓ']) <= 2030);
    segments2025to2030.forEach(segment => {
        const start = (parseFloat(segment['PK inici']) / pkMaxGlobal) * 100;
        const end = (parseFloat(segment['PK final']) / pkMaxGlobal) * 100;
        ['Vía 1', 'Vía 2'].forEach((_, index) => {
            const highlight = document.createElement('div');
            highlight.style.position = 'absolute';
            highlight.style.top = `${index * 25}px`;
            highlight.style.left = `${start}%`;
            highlight.style.width = `${end - start}%`;
            highlight.style.height = '10px';
            highlight.style.backgroundColor = 'orange';
            highlight.style.borderRadius = '5px';
            lineContainer.appendChild(highlight);
        });
    });

    infoContainer.appendChild(lineContainer);

    // Add total renovation length information
    const totalRenovationBefore2025 = segmentsBefore2025.reduce((sum, segment) => sum + (parseFloat(segment['PK final']) - parseFloat(segment['PK inici'])) * 1000, 0);
    const totalRenovation2025to2030 = segments2025to2030.reduce((sum, segment) => sum + (parseFloat(segment['PK final']) - parseFloat(segment['PK inici'])) * 1000, 0);
    const totalLength = resumData.filter(d => d.TRAM === tram).reduce((sum, segment) => sum + (parseFloat(segment['PK final']) - parseFloat(segment['PK inici'])) * 1000, 0);

    const renovationText = document.createElement('p');
    renovationText.innerHTML = `
               <span style="color: red; font-size: 18px;"><b>${totalRenovationBefore2025.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} m</b> (${((totalRenovationBefore2025 / totalLength) * 100).toFixed(2)}%) - Antes de 2025</span><br>
        <span style="color: orange; font-size: 18px;"><b>${totalRenovation2025to2030.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} m</b> (${((totalRenovation2025to2030 / totalLength) * 100).toFixed(2)}%) - Entre 2025 y 2030</span>
    `;

    renovationText.style.textAlign = 'center';
    renovationText.style.marginTop = '10px';
    infoContainer.appendChild(renovationText);

    // Añadir el contenedor informativo debajo del gráfico
    document.getElementById('plot').appendChild(infoContainer);
}

// Función para dibujar un gráfico específico
async function drawPlot(tram, resumData, estacionsData, containerId = 'plot', addHorizontalLabels = false, pkMinGlobal = null, pkMaxGlobal = null, plotHeight = 500) {
    let traces = [];
    let stationAnnotations = [];
    let shapes = [];

    let pkMin = Infinity;
    let pkMax = -Infinity;

    function groupConsecutiveSegments(data) {
        const groupedData = [];
        let currentGroup = null;

        data.forEach(segment => {
            const pkInici = parseFloat(segment['PK inici']);
            const pkFinal = parseFloat(segment['PK final']);
            const previsio = segment['PREVISIÓ REHABILITACIÓ'];

            if (currentGroup && currentGroup.PKFinal === pkInici && currentGroup.PREVISIO === previsio && currentGroup.via === segment.Via) {
                currentGroup.PKFinal = pkFinal;
                currentGroup.length += (pkFinal - pkInici) * 1000;
            } else {
                if (currentGroup) {
                    groupedData.push(currentGroup);
                }
                currentGroup = {
                    PKInici: pkInici,
                    PKFinal: pkFinal,
                    PREVISIO: previsio,
                    length: (pkFinal - pkInici) * 1000,
                    via: segment.Via
                };
            }
        });

        if (currentGroup) {
            groupedData.push(currentGroup);
        }

        return groupedData;
    }

    const via1Data = resumData.filter(d => parseInt(d.Via) === 1 && d.TRAM === tram);
    const via2Data = resumData.filter(d => parseInt(d.Via) === 2 && d.TRAM === tram);

    const via1 = groupConsecutiveSegments(via1Data);
    const via2 = groupConsecutiveSegments(via2Data);

    if (via1.length > 0 || via2.length > 0) {
        pkMin = Math.min(...via1.concat(via2).map(d => d.PKInici));
        pkMax = Math.max(...via1.concat(via2).map(d => d.PKFinal));

        if (pkMinGlobal !== null) pkMin = pkMinGlobal;
        if (pkMaxGlobal !== null) pkMax = pkMaxGlobal;

        traces.push({
            x: via1.map(d => d.PREVISIO),
            y: via1.map(d => d.PKFinal - d.PKInici),
            base: via1.map(d => d.PKInici),
            type: 'bar',
            name: 'Vía 1',
            orientation: 'v',
            width: 0.5,
            offset: 0,
            marker: {
                color: 'rgba(31, 119, 180, 1)'
            },
            hoverinfo: 'text',
            hovertext: via1.map(d => `${Math.round(d.length)} m`),
            hoverlabel: {
                bgcolor: 'rgba(31, 119, 180, 1)',
                font: {
                    color: 'white'
                }
            }
        });

        traces.push({
            x: via2.map(d => d.PREVISIO),
            y: via2.map(d => d.PKFinal - d.PKInici),
            base: via2.map(d => d.PKInici),
            type: 'bar',
            name: 'Vía 2',
            orientation: 'v',
            width: 0.5,
            offset: 0.5,
            marker: {
                color: 'rgba(255, 127, 14, 1)'
            },
            hoverinfo: 'text',
            hovertext: via2.map(d => `${Math.round(d.length)} m`),
            hoverlabel: {
                bgcolor: 'rgba(255, 127, 14, 1)',
                font: {
                    color: 'white'
                }
            }
        });

        // Añadir anotaciones y líneas de referencia para las estaciones
        const estaciones = estacionsData.filter(d => d.Tram === tram);

        stationAnnotations.push(...estaciones.map(d => ({
            x: 2069,
            y: parseFloat(d['PK']),
            text: `<b>${d['Abreviatura']}</b>`,
            showarrow: false,
            font: {
                color: 'black',
                size: 14,
                family: 'Arial, sans-serif'
            },
            xanchor: 'left',
            yanchor: 'middle',
            bgcolor: 'white',
            bordercolor: 'gray',
            borderwidth: 2,
            borderpad: 5,
            opacity: 1
        })));

        shapes.push(...estaciones.map(d => ({
            type: 'line',
            x0: 1995,
            x1: 2069,
            y0: parseFloat(d['PK']),
            y1: parseFloat(d['PK']),
            line: {
                color: 'darkgray',
                width: 1.5,
                layer: 'below'
            }
        })));

        // Añadir líneas y sombreado para los años y la línea roja para 2025
        shapes = shapes.concat(addLinesAndShading(pkMin, pkMax));
    }

    // Configuración del layout del gráfico
    const layout = {
        title: addHorizontalLabels ? '' : `Espai-temps previsió rehabilitació del tram ${tram}`,
        xaxis: {
            title: addHorizontalLabels ? 'Any previsió rehabilitació' : '',
            range: [1995, 2070],
            tickvals: Array.from({ length: 75 }, (_, i) => 1995 + i).filter(year => year % 5 === 0),
            tickangle: addHorizontalLabels ? -45 : 0,
            showticklabels: addHorizontalLabels
        },
        yaxis: {
            title: 'PK',
            autorange: 'reversed',
            range: [pkMax, pkMin],
            tickvals: Array.from({ length: Math.ceil(pkMax - pkMin + 1) }, (_, i) => Math.floor(pkMin) + i),
            ticktext: Array.from({ length: Math.ceil(pkMax - pkMin + 1) }, (_, i) => `${Math.floor(pkMin) + i}+000`)
        },
        showlegend: true,
        legend: {
            orientation: 'v',
            x: 1.05,
            xanchor: 'left',
            y: 0.5,
            valign: 'middle'
        },
        annotations: stationAnnotations,
        shapes: shapes,
        hovermode: 'closest',
        margin: {
            l: 150,
            r: 150,
            t: 20,
            b: addHorizontalLabels ? 50 : 20
        },
        height: plotHeight // Ajustar la altura del gráfico
    };

    // Dibujar la gráfica
    Plotly.newPlot(containerId, traces, layout);
}
