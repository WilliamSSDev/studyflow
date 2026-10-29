document.addEventListener("DOMContentLoaded", () => {
    const weeklyData = {
        labels: ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"],
        values: [3, 5, 4, 7, 6, 8, 9]
    };

    const difficultyData = {
        labels: ["Fácil", "Bom", "Médio", "Difícil"],
        values: [42, 30, 18, 10]
    };

    if (window.Chart) {
        new Chart(document.getElementById("weeklyChart"), {
            type: "line",
            data: {
                labels: weeklyData.labels,
                datasets: [{
                    label: "Cards",
                    data: weeklyData.values,
                    borderColor: "#6ad1b0",
                    backgroundColor: "rgba(106, 209, 176, 0.2)",
                    borderWidth: 3,
                    tension: 0.35,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, ticks: { color: "#a9bfd0" }, grid: { color: "rgba(169, 191, 208, 0.1)" } },
                    x: { ticks: { color: "#a9bfd0" }, grid: { display: false } }
                }
            }
        });

        new Chart(document.getElementById("difficultyChart"), {
            type: "doughnut",
            data: {
                labels: difficultyData.labels,
                datasets: [{
                    data: difficultyData.values,
                    backgroundColor: ["#6ad1b0", "#7fa8ff", "#f5c66f", "#ff8f8f"],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: "bottom", labels: { color: "#edf6ff" } } }
            }
        });
    }
});
