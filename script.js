async function drawPlot(tram, resumData, estacionsData, containerId = 'plot', isLast = true, pkMinGlobal = null, pkMaxGlobal = null) {
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

    // Agrupar todas las barras para "Vía 1" y "Vía 2" en una única traza para cada vía
    const via1 = groupConsecutiveSegments(via1Data);
    const via2 = groupConsecutiveSegments(via2Data);

    if (via1.length > 0 || via2.length > 0) {
        pkMin = Math.min(...via1.concat(via2).map(d => d.PKInici));
        pkMax = Math.max(...via1.concat(via2).map(d => d.PKFinal));

        // Ajustar pkMin y pkMax si se proporcionan valores globales
        if (pkMinGlobal !== null) pkMin = pkMinGlobal;
        if (pkMaxGlobal !== null) pkMax = pkMaxGlobal;

        // Crear trazas para las vías con colores modificados para la prueba
        traces.push({
            x: via1.map(d => d.PREVISIO),
            y: via1.map(d => d.PKFinal - d.PKInici),
            base: via1.map(d => d.PKInici),
            type: 'bar',
            name: 'Vía 1',
            orientation: 'v',
            width: 0.5, // Ancho de la barra que ocupará la mitad del espacio del año
            offset: -0.25, // Desplazar la barra hacia la mitad izquierda del año
            marker: {
                color: 'rgba(0, 128, 0, 1)' // Cambiado a verde
            },
            hoverinfo: 'text',
            hovertext: via1.map(d => `Longitud: ${Math.round(d.length)} m`),
            hoverlabel: {
                bgcolor: 'rgba(0, 128, 0, 1)',
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
            width: 0.5, // Ancho de la barra que ocupará la mitad del espacio del año
            offset: 0.25, // Desplazar la barra hacia la mitad derecha del año
            marker: {
                color: 'rgba(128, 0, 128, 1)' // Cambiado a morado
            },
            hoverinfo: 'text',
            hovertext: via2.map(d => `Longitud: ${Math.round(d.length)} m`),
            hoverlabel: {
                bgcolor: 'rgba(128, 0, 128, 1)',
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
            range: [pkMax, pkMin], // Asegurar una escala consistente
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
            l: 150, // Ajustar margen izquierdo para el espacio de la etiqueta del tramo
            r: 150, // Aumentar margen derecho para evitar que las etiquetas se corten
            t: 20,
            b: isLast ? 50 : 20 // Mayor margen inferior para el último gráfico
        },
        height: 500 // Altura para cada tramo
    };

    // Dibujar la gráfica
    Plotly.newPlot(containerId, traces, layout);
}
