        traces.push({
            x: via2.map(d => d.PREVISIO),
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
        addLinesAndShading(pkMin, pkMax);
    }

    // Configuración del gráfico
    const layout = {
        title: isLast ? `Espai-temps previsió rehabilitació del tram ${tram}` : '',
        xaxis: {
            title: isLast ? 'Any previsió rehabilitació' : '',
            range: [1995, 2069],
            tickvals: Array.from({ length: 75 }, (_, i) => 1995 + i).filter(year => year % 5 === 0),
            tickangle: -45,
            showticklabels: isLast
        },
        yaxis: {
            title: 'PK',
            autorange: 'reversed',
            tickvals: Array.from({ length: Math.ceil(pkMax - pkMin + 1) }, (_, i) => Math.floor(pkMin) + i),
            ticktext: Array.from({ length: Math.ceil(pkMax - pkMin + 1) }, (_, i) => `${Math.floor(pkMin) + i}+000`)
        },
        showlegend: true,
        legend: {
            orientation: 'h',
            x: 0.5,
            xanchor: 'center',
            y: 1.1 // Ajustar la leyenda para que no se superponga con el gráfico
        },
        annotations: stationAnnotations,
        shapes: shapes,
        hovermode: 'closest',
        margin: {
            l: 150, // Ajustar margen izquierdo para espacio del identificador del tramo
            r: 50, // Aumentar margen derecho para evitar que se corten las etiquetas
            t: 20,
            b: isLast ? 50 : 20 // Margen inferior mayor para el último gráfico
        },
        height: 500 // Altura aumentada para cada tramo
    };

    // Dibujar la gráfica
    Plotly.newPlot(containerId, traces, layout);
}

function addLinesAndShading(pkMin, pkMax) {
    let shapes = [];
    for (let year = 1995; year <= 2069; year++) {
        // Añadir líneas verticales para cada año
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

        // Añadir sombreado cada 5 años
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

    // Añadir sombreado rojo antes de 2025
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

    // Añadir línea roja en 2025
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

// Inicializar la página y eventos
document.addEventListener('DOMContentLoaded', init);
