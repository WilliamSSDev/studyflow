export function createCharts() {
    const difficultyChart = new Chart(document.getElementById("difficultyChart"), {
        type: "pie",
        data: {
            labels: ["Hard", "Medium", "Easy", "Good"],
            datasets: [{
                data: [20, 15, 35, 30],
                backgroundColor: ["#ff6384", "#ffcd56", "#4bc0c0", "#36a2eb"]
            }]
        },
        options: {
            plugins: {
                legend: {
                    labels: { color: "#fff" }
                }
            }
        }
    })

    const reviewChart = new Chart(document.getElementById("reviewChart"), {
        type: "bar",
        data: {
            labels: Array.from({ length: 30 }, (_, index) => String(index + 1)),
            datasets: [{
                label: "Cards revisados",
                data: [
                    9, 10, 12, 10, 17, 15, 23, 20, 14, 14,
                    11, 11, 14, 15, 8, 12, 6, 8, 11, 8,
                    19, 16, 15, 11, 20, 14, 4
                ],
                backgroundColor: "rgba(123, 97, 255, 0.9)",
                borderColor: "#7b61ff",
                borderWidth: 1,
                borderRadius: 6,
                barThickness: 14
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "#111827",
                    titleColor: "#fff",
                    bodyColor: "#fff",
                    borderColor: "#7b61ff",
                    borderWidth: 1
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: "#9ca3af" }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: "rgba(255,255,255,0.08)" },
                    ticks: { color: "#9ca3af" }
                }
            }
        }
    })

    return { difficultyChart, reviewChart }
}

export function createActivityChart(canvas, labels, values) {
    return new Chart(canvas, {
        type: "bar",
        data: {
            labels,
            datasets: [{
                label: "Cards estudados",
                data: values,
                backgroundColor: values.map((_, index) => index === values.length - 1 ? "#197d63" : "#a6e3c4"),
                borderRadius: 7,
                maxBarThickness: 38,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: context => `${context.parsed.y} cards` } },
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: "#6d8178" } },
                y: { beginAtZero: true, ticks: { precision: 0, color: "#6d8178" }, grid: { color: "rgba(109, 129, 120, 0.16)" } },
            },
        },
    })
}
