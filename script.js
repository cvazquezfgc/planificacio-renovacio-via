async function loadData(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error(`Error loading data from ${url}:`, error);
        return null;
    }
}

async function init() {
    const resumUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/resum.json';
    const resumData = await loadData(resumUrl);
    if (!resumData) {
        console.error('Failed to load summary data.');
        return;
    }

    // Get unique trams
    const trams = [...new Set(resumData.map(d => d.TRAM))];
    if (trams.length === 0) {
        console.error('No trams found in the loaded data.');
        return;
    }

    // Tram buttons container
    const tramButtonsContainer = document.getElementById('tramButtons');

    // Add the button for "LINIA COMPLETA"
    const liniaCompletaButton = document.createElement('button');
    liniaCompletaButton.className = 'tram-button';
    liniaCompletaButton.textContent = 'LINIA COMPLETA';
    liniaCompletaButton.addEventListener('click', () => {
        selectTramButton(liniaCompletaButton);
        drawFullLinePlot(trams, resumData);
    });
    tramButtonsContainer.appendChild(liniaCompletaButton);

    // Add buttons for each tram
    trams.forEach(tram => {
        if (tram) {
            const button = document.createElement('button');
            button.className = 'tram-button';
            button.textContent = tram;
            button.addEventListener('click', () => {
                selectTramButton(button);
                drawSinglePlot(tram, resumData);
            });
            tramButtonsContainer.appendChild(button);
        }
    });

    // Select and draw "LINIA COMPLETA" by default
    selectTramButton(liniaCompletaButton);
    drawFullLinePlot(trams, resumData);
}

function selectTramButton(button) {
    document.querySelectorAll('.tram-button').forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
}

async function drawFullLinePlot(trams, resumData) {
    // Clear existing plots
    document.getElementById('plot').innerHTML = '';

    // Load estacions data once
    const estacionsUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/estacions.json';
    const estacionsData = await loadData(estacionsUrl);
    if (!estacionsData) {
        console.error('Failed to load station data.');
        return;
    }

    // Get overall pkMin and pkMax to keep the same scale
    let overallPkMin = Infinity;
    let overallPkMax = -Infinity;
    trams.forEach(tram => {
        const via1Data = resumData.filter(d => parseInt(d.Via) === 1 && d.TRAM === tram);
        const via2Data = resumData.filter(d => parseInt(d.Via) === 2 && d.TRAM === tram);
        if (via1Data.length > 0 || via2Data.length > 0) {
            const pkMin = Math.min(...via1Data.concat(via2Data).map(d => parseFloat(d['PK inici'])));
            const pkMax = Math.max(...via1Data.concat(via2Data).map(d => parseFloat(d['PK final'])));
            if (pkMin < overallPkMin) overallPkMin = pkMin;
            if (pkMax > overallPkMax) overallPkMax = pkMax;
        }
    });

    for (let i = 0; i < trams.length; i++) {
        const tram = trams[i];

        // Create a container for each plot
        const container = document.createElement('div');
        container.id = `plot-${tram}`;
        container.style.display = 'flex';
        container.style.alignItems = 'center';
        container.style.marginBottom = '10px';

        // Create a container for the tram label
        const labelContainer = document.createElement('div');
        labelContainer.style.writingMode = 'vertical-lr'; // Change text orientation
        labelContainer.style.textAlign = 'center';
        labelContainer.style.marginRight = '10px';
        labelContainer.style.fontSize = '16px';
        labelContainer.style.fontWeight = 'bold';
        labelContainer.style.height = '500px';
        labelContainer.textContent = tram;

        // Create a container for the plot
        const plotContainer = document.createElement('div');
        plotContainer.id = `plot-${tram}-chart`;
        plotContainer.style.height = `500px`; // Keep a consistent height
        plotContainer.style.flexGrow = '1';

        // Append label and plot to the main container
        container.appendChild(labelContainer);
        container.appendChild(plotContainer);

        // Append the container to the main plot area
        document.getElementById('plot').appendChild(container);

        // Call the drawPlot function for each tram
        await drawPlot(tram, resumData, estacionsData, plotContainer.id, i === trams.length - 1, overallPkMin, overallPkMax);
    }
}

async function drawSinglePlot(tram, resumData) {
    // Clear existing plots
    document.getElementById('plot').innerHTML = '';

    // Load estacions data
    const estacionsUrl = 'https://raw.githubusercontent.com/cvazquezfgc/planificacio-renovacio-via/main/estacions.json';
    const estacionsData = await loadData(estacionsUrl);
    if (!estacionsData) {
        console.error('Failed to load station data.');
        return;
    }

    // Call the drawPlot function for the individual tram
    await drawPlot(tram, resumData, estacionsData, 'plot', true);
}

async function drawPlot(tram, resumData, estacionsData, containerId = 'plot', isLast = true, overallPkMin = null, overallPkMax = null) {
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

    // Group all bars for "Vía 1" and "Vía 2" into a single trace for each vía
    const via1 = groupConsecutiveSegments(via1Data);
    const via2 = groupConsecutiveSegments(via2Data);

    if (via1.length > 0 || via2.length > 0) {
        pkMin = Math.min(...via1.concat(via2).map(d => d.PKInici));
        pkMax = Math.max(...via1.concat(via2).map(d => d.PKFinal));

        // Adjust pkMin and pkMax if overall values are provided
        if (overallPkMin !== null) pkMin = overallPkMin;
        if (overallPkMax !== null) pkMax = overallPkMax;

        // Create traces for the vías
        // Adjust x positions by adding 0.5 to place bars between vertical lines
        traces.push({
            x: via1.map(d => d.PREVISIO + 0.5),
            y: via1.map(d => d.PKFinal - d.PKInici),
            base: via1.map(d => d.PKInici),
            type: 'bar',
            name: 'Vía 1',
            orientation: 'v',
            width: 0.4,
            marker: {
                color: 'rgba(31, 119, 180, 1)'
            },
            hoverinfo: 'text',
            hovertext: via1.map(d => `Longitud: ${Math.round(d.length)} m`),
            hoverlabel: {
                bgcolor: 'rgba(31, 119, 180, 1)',
                font: {
                    color: 'white'
                }
            }
        });

        traces.push({
            x: via2.map(d => d.PREVISIO + 0.5),
            y: via2.map(d => d.PKFinal - d.PKInici),
            base: via2.map(d => d.PKInici),
            type: 'bar',
            name: 'Vía 2',
            orientation: 'v',
            width: 0.4,
            marker: {
                color: 'rgba(255, 127, 14, 1)'
            },
            hoverinfo: 'text',
            hovertext: via2.map(d => `Longitud: ${Math.round(d.length)} m`),
            hoverlabel: {
                bgcolor: 'rgba(255, 127, 14, 1)',
                font: {
                    color: 'white'
                }
            }
        });

        // Add annotations and reference lines for stations
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

        // Add lines and shading for years and red line for 2025
        shapes = shapes.concat(addLinesAndShading(pkMin, pkMax));
    }

    // Layout configuration
    const layout = {
        title: isLast ? `Espai-temps previsió rehabilitació del tram ${tram}` : '',
        xaxis: {
            title: isLast ? 'Any previsió rehabilitació' : '',
            range: [1995, 2070],
            tickvals: Array.from({ length: 75 }, (_, i) => 1995 + i).filter(year => year % 5 === 0),
            tickangle: -45,
            showticklabels: isLast
        },
        yaxis: {
            title: 'PK',
            autorange: 'reversed',
            range: [pkMax, pkMin], // Ensure consistent scale
            tickvals: Array.from({ length: Math.ceil(pkMax - pkMin + 1) }, (_, i) => Math.floor(pkMin) + i),
            ticktext: Array.from({ length: Math.ceil(pkMax - pkMin + 1) }, (_, i) => `${Math.floor(pkMin) + i}+000`)
        },
        showlegend: true,
        legend: {
            orientation: 'v',
            x: 1.05,
            xanchor: 'left',
            y: 1
        },
        annotations: stationAnnotations,
        shapes: shapes,
        hovermode: 'closest',
        margin: {
            l: 150, // Adjust left margin for tram label space
            r: 150, // Increase right margin to prevent labels from being cut off
            t: 20,
            b: isLast ? 50 : 20 // Larger bottom margin for the last plot
        },
        height: 500 // Height for each tram
    };

    // Draw the plot
    Plotly.newPlot(containerId, traces, layout);
}

function addLinesAndShading(pkMin, pkMax) {
    let shapes = [];
    for (let year = 1995; year <= 2069; year++) {
        // Add vertical lines for each year
        shapes.push({
            type: 'line',
            x0: year,
            x1: year,
            y0: pkMin,
            y1: pkMax,
            line: {
                color: 'lightgray',
                width: 0.8,
                layer: 'below'
            }
        });

        // Add shading every 5 years
        if (year % 5 === 0) {
            shapes.push({
                type: 'rect',
                x0: year,
                x1: year + 1,
                y0: pkMin,
                y1: pkMax,
                fillcolor: 'rgba(211, 211, 211, 0.3)',
                layer: 'below',
                line: {
                    width: 0
                }
            });
        }
    }

    // Add light red shading before 2025
    shapes.push({
        type: 'rect',
        x0: 1995,
        x1: 2025,
        y0: pkMin,
        y1: pkMax,
        fillcolor: 'rgba(255, 0, 0, 0.1)',
        layer: 'below',
        line: {
            width: 0
        }
    });

    // Add red line at 2025
    shapes.push({
        type: 'line',
        x0: 2025,
        x1: 2025,
        y0: pkMin,
        y1: pkMax,
        line: {
            color: 'red',
            width: 2,
            layer: 'above'
        }
    });

    return shapes;
}

// Initialize the page and events
document.addEventListener('DOMContentLoaded', init);
