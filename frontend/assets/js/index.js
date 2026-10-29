import {
    addCard,
    apiFetch,
    deleteCard,
    getCardsInfo,
    getUserInfo,
    logout,
    pickCard,
    refreshToken,
    updateCardDifficulty,
    verifyAuthentication,
    viewCards,
    API_BASE_URL
} from "./api.js"
import { createCharts } from "./charts.js"

// =========================
// DOM ELEMENTS
// =========================

const userInfoElement = document.getElementById("user-info")

const viewCardsButton =
    document.getElementById("view-cards")

const addCardButton =
    document.getElementById("open-add-card")

const reviewSection =
    document.getElementById("review-section");

const reviewCardsButton =
    document.getElementById("review-cards");


// Salvar carta
const submitButton = document.getElementById("submit-button")

const addCardSection =
    document.getElementById("add-card-section")

const frontContentInput =
    document.getElementById("front-content")

const backContentInput =
    document.getElementById("back-content")

const deckNameInput =
    document.getElementById("deck-name")

const tableBody = document.getElementById("cards-table-body")

const questionField = document.getElementById("review-front-content")

const answerField = document.getElementById("review-back-content")

const viewCardsWindow = document.getElementById("view-cards-window")

const removeCards = document.getElementById("remove-all-cards")

const answerButton = document.getElementById("show-answer-button")

const emptyReviewSection = document.getElementById("empty-review-section")

const logoutButton = document.getElementById("logout-button")
const flashcardItem = document.getElementById("flashcard-item")
const cardInner = document.getElementById("card-inner")
const difficultyButtons = document.getElementById("difficulty-buttons")

const progressStatus = document.getElementById("progress-status")
const statisticsButton = document.getElementById("statistics")
const statisticsSection = document.getElementById("statistics-section")


// =========================
// STATE
// =========================

let isCardWindowOpened = false
let isViewCardWindowOpened = false
let isReviewSectionOpened = false
let selectedCardsToRemove = []
let currentCard = null

function atualizarResumo(total, estudados, acertos, sequencia) {
    const elTotal = document.getElementById('stat-total-cards');
    const elEstudados = document.getElementById('stat-studied-today');
    const elAcertos = document.getElementById('stat-success-count');
    const elSequencia = document.getElementById('stat-streak-days');

    if (elTotal) elTotal.textContent = total;
    if (elEstudados) elEstudados.textContent = estudados;
    if (elAcertos) elAcertos.textContent = acertos;
    if (elSequencia) elSequencia.textContent = sequencia;
}

async function loadReviewCard() {
    const { card } = await pickCard()

    if (!card) {
        return null
    }

    currentCard = card
    questionField.textContent = card.front_content
    answerField.textContent = card.back_content

    return card
}

function updateProgress(userInfo, cardsToReview) {

    if (!userInfo || userInfo.total_cards === 0) {
        atualizarProgresso(0);
        progressStatus.textContent = `0 / 0`;
        return;
    }

    const studiedCards = userInfo.studied_today;

    const porcentagem = (studiedCards / cardsToReview) * 100;

    progressStatus.textContent = `${studiedCards} / ${cardsToReview}`;

    console.log("Cartas estudadas hoje:", studiedCards);
    atualizarProgresso(porcentagem.toFixed(2));
}


async function fetchAndDisplayNextCard() {
    // 1. If a card is currently loaded, swipe it away first
    if (currentCard) {
        flashcardItem.classList.add("swipe-left");
        // Wait 400 milliseconds for the CSS slide out animation to finish
        await new Promise(resolve => setTimeout(resolve, 400));
    }

    // 2. Fetch new backend data
    try {
        const data = await pickCard()
        const card = data.card;

        const totalCards = data.total_cards;
        const cardsToReview = data.cards_to_review;

        const userInfo = await getCardsInfo();

        await atualizarResumo(userInfo.total_cards, userInfo.studied_today, userInfo.correct_today, userInfo.current_streak)

        if (!card) {
            hideAllSections();
            emptyReviewSection.style.display = "block";
            currentCard = null;
            updateProgress(userInfo, cardsToReview)
            return;
        }


        // 3. Teleport our empty card frame onto the right side stage out of view
        flashcardItem.className = "flashcard-item prepare-right";
        cardInner.classList.remove("is-flipped"); // Reset face rotation angle

        // Force browser to register positioning layout change before updating visuals
        void flashcardItem.offsetWidth;

        // 4. Paint the text updates
        currentCard = card;
        questionField.textContent = card.front_content;
        answerField.textContent = card.back_content;

        updateProgress(userInfo, cardsToReview)

        // // Reset control interface button wrappers
        answerButton.style.display = 'block';

        // // 5. Release card to glide smoothly back center stage
        flashcardItem.className = "flashcard-item";

    } catch (error) {
        console.error("Failed executing deck cycle step:", error);
    }
}

// =========================
// UI FUNCTIONS
// =========================

function atualizarProgresso(porcentagem) {
    const fgCircle = document.querySelector('.fg-circle');
    const textDisplay = document.querySelector('.progress-text');

    const circunferenciaTotal = 314;
    // Descobre quanto vai sobrar subtraindo a fração da porcentagem
    const offset = circunferenciaTotal - (circunferenciaTotal * (porcentagem / 100));

    // Aplica no estilo e atualiza o texto interno
    fgCircle.style.strokeDashoffset = offset;
    textDisplay.textContent = `${porcentagem}%`;
}

// Exemplo de uso: atualizarProgresso(72);

async function toggleReviewSection(cards) {

    const shouldOpen =
        !isReviewSectionOpened;

    hideAllSections();

    if (shouldOpen) {

        if (!cards){
            console.log("Empty review section is been displayed.")
            emptyReviewSection.style.display = "flex"
        } else {
            reviewSection.style.display = "flex";

            console.log("review section is been displayed.")
        }
        isReviewSectionOpened = true;


    } else {

        reviewSection.style.display = "none";
        emptyReviewSection.style.display = "none"

        isReviewSectionOpened = false;
    }
}

function toggleRemoveCardsButton() {

    if (selectedCardsToRemove.length >= 1) {

        removeCards.style.display = "flex";
        removeCards.textContent = `Remover selecionados ${selectedCardsToRemove.length}`

    } else {

        removeCards.style.display = "none";
    }
}

function hideAllSections() {

    addCardSection.style.display = "none";

    viewCardsWindow.style.display = "none";

    reviewSection.style.display = "none";

    emptyReviewSection.style.display = "none"

    statisticsSection.style.display = "none"

    isCardWindowOpened = false;

    isViewCardWindowOpened = false;

    isReviewSectionOpened = false;

    resetSelectedCards();
}

function resetSelectedCards() {

    selectedCardsToRemove = [];

    toggleRemoveCardsButton();

    document.querySelectorAll(".selected-row")
        .forEach(row => {

            row.classList.remove("selected-row");

        });
}

function toggleAddCardSection() {

    const shouldOpen = !isCardWindowOpened;

    hideAllSections();

    if (shouldOpen) {

        addCardSection.style.display = "block";

        isCardWindowOpened = true;
    }
}

async function toggleViewCardsSection() {

    const shouldOpen = !isViewCardWindowOpened;

    hideAllSections();

    if (shouldOpen) {

        viewCardsWindow.style.display = "block";

        isViewCardWindowOpened = true;
    }
}


async function updateUserUI() {

    if (!userInfoElement) {
        console.log("Element user-info does not exist.")
        return
    }
    const userInfo = await getCardsInfo();
    const user = await getUserInfo()

    if (!user || !user.user_info || !user.user_info.name) {
        console.log(user)
        console.log("User information wasn't loaded properly.")
        return
    }

    userInfoElement.textContent =
        user.user_info.name

    atualizarResumo(userInfo.total_cards, userInfo.studied_today, userInfo.correct_today, userInfo.current_streak)

    const data = await pickCard()
    const totalCards = data.total_cards;
    const cardsToReview = data.cards_to_review;

    updateProgress(userInfo, cardsToReview)

}


// =========================
// AUTH FLOW
// =========================

async function authenticateUser() {

    let authenticated =
        await verifyAuthentication()

    if (authenticated) {
        return true
    }

    console.log("Access token expired. Trying refresh...")

    const refreshData = await refreshToken()

    if (!refreshData.authenticated) {

        console.log("Refresh failed.")

        window.location.href =
            "login_page.html"

        return false
    }

    console.log("Token refreshed successfully.")

    return true
}
// =========================
// EVENT LISTENERS
// =========================

let isFlipped = false
const { reviewChart } = createCharts()


statisticsButton.addEventListener('click', async () => {

    console.log("Statistics button clicked");

    const isVisible =
        statisticsSection.style.display === 'flex';

        const data = await apiFetch(`${API_BASE_URL}/cards/reviews_period?days_period=30`);

        const jsonData = await data.json();

        let array = [];

        Object.values(jsonData).forEach(value => {
            array.push(value);
            console.log(value)
        })

        console.log(array)

        reviewChart.data.datasets[0].data = array;
        reviewChart.update();

    hideAllSections();

    if (!isVisible) {
        statisticsSection.style.display = 'flex';
    }

});



answerButton.addEventListener('click', async () => {
    // Adiciona a classe que gira a carta em 180 graus no espaço 3D

    if (!isFlipped){
        cardInner.classList.add('is-flipped');
        isFlipped = true;
        difficultyButtons.style.display = 'flex';

    } else {
        cardInner.classList.remove('is-flipped');
        isFlipped = false;
        difficultyButtons.style.display = 'none';
    }

    console.log("Mostrar resposta has been clicked.")
});

reviewCardsButton.addEventListener("click", async() => {

    // showToast("Iniciando sessão de estudo...")

    const hasCards = await loadReviewCard()
    await toggleReviewSection(hasCards);

});

logoutButton.addEventListener("click", async () => {

    await logout()

    window.location.href = "login_page.html";
});

addCardButton.addEventListener("click", () => {

    toggleAddCardSection()
})

removeCards.addEventListener("click", async () => {

    for (const cardId of selectedCardsToRemove) {

        await deleteCard(cardId);

    }

    selectedCardsToRemove = [];
    toggleRemoveCardsButton();
    location.reload();

});
submitButton.addEventListener("click", async (event) => {

    event.preventDefault();

    const frontContent =
        frontContentInput.value.trim()

    const backContent =
        backContentInput.value.trim()

    const deckName =
        deckNameInput.value.trim()

    if (!frontContent || !backContent || !deckName) {

        console.log("Fields are empty.")

        return
    }

    const result =
        await addCard(frontContent, backContent)

    console.log(result)

    // Optional cleanup

    frontContentInput.value = ""
    backContentInput.value = ""

    console.log("Adding card...")

    location.reload();
})


viewCardsButton.addEventListener("click", async () => {

    console.log("View cards clicked.")

    // showToast("Carregando cartas...", "info")

    // await toggleRemoveCardsButton();

    const isViewWindowOpened = await toggleViewCardsSection();

    await viewCards();

    if (!isViewCardWindowOpened){
        return
    }

    const cards = await viewCards(9999)

    if (!cards.cards){
        console.log("No cards to show")
        tableBody.innerHTML = "";
        return
    }

    tableBody.innerHTML = "";

    const cardsArray = cards.cards

    cardsArray.forEach(card => {
        const row = document.createElement("tr");

        row.addEventListener("click", async () => {

            let cardIdClicked =
                row.querySelector(".card-id");

            const cardId =
                parseInt(cardIdClicked.textContent);

            if (selectedCardsToRemove.includes(cardId)) {

                selectedCardsToRemove =
                    selectedCardsToRemove.filter(
                        id => id !== cardId
                    );

                row.classList.remove("selected-row");

                console.log("Removed:", cardId);

            } else {

                selectedCardsToRemove.push(cardId);

                row.classList.add("selected-row");

                console.log("Added:", cardId);
            }

            await toggleRemoveCardsButton();

            console.log(selectedCardsToRemove);

        });

        row.innerHTML = `
        <td><h3 class="card-id">${card.id}</h3></td>
        <td>${card.front_content}</td>
        <td>${card.back_content}</td>
        <td>
            <button type="button" class="delete-button">
                🗑️
            </button>
        </td>
        `

        const deleteButton = row.querySelector(".delete-button");

        deleteButton.addEventListener("click", async (event) => {

            event.preventDefault();

            const confirmed = confirm(
                "Tem certeza que deseja deletar esta carta?"
            );

            if (!confirmed) {
                return;
            }

            console.log("Deleting card", card.id);

            await deleteCard(card.id);

            row.remove();

        });

    tableBody.appendChild(row)


    });

})

document.querySelectorAll(".difficulty-btn").forEach(button => {

    button.addEventListener("click", async (event) => {

        // event.preventDefault();

        try {

            const difficulty = event.currentTarget.dataset.difficulty;

            console.log(difficulty);

            const cardID = currentCard.id;

            await updateCardDifficulty(cardID, difficulty)

            await fetchAndDisplayNextCard()

            // await updateUserUI()

            difficultyButtons.style.display = 'none';

        } catch (err) {

            console.error("ERROR:", err);
        }
    });

});
// =========================
// APP INITIALIZATION
// =========================
window.addEventListener("DOMContentLoaded", async () => {

    console.log("Site has been loaded.")

    // tableBody.style.display = "none"

    const authenticated =
        await authenticateUser()

    if (!authenticated) {
        return
    }

    await updateUserUI()
})
