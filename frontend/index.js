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

const submitButton =
    document.getElementById("submit-button")

const addCardSection =
    document.getElementById("add-card-section")

const frontContentInput =
    document.getElementById("front-content")

const backContentInput =
    document.getElementById("back-content")

const deckNameInput =
    document.getElementById("deck-name")

const viewCardsElement =
    document.getElementById("view-cards")

const tableBody =
    document.getElementById("cards-table-body");

const questionField = document.getElementById('review-front-content');

const answerField = document.getElementById('review-back-content');

const viewCardsWindow = document.getElementById("view-cards-window");

const removeCards = document.getElementById("remove-all-cards")

const answerButton = document.getElementById("show-answer-button")

const emptyReviewSection = 
        document.getElementById("empty-review-section");

const logoutButton = document.getElementById("logout-button");

// Difficulty buttons
const easyButton = document.getElementById("easy-button")
const mediumButton = document.getElementById("medium-button")
const hardButton = document.getElementById("hard-button")


// Grab our newly structured elements
const flashcardItem = document.getElementById("flashcard-item");
const cardInner = document.getElementById("card-inner");

const reviewBack = document.getElementById("review-back");
const difficultyButtons = document.getElementById("difficulty-buttons");


// =========================
// STATE
// =========================

let isCardWindowOpened = false
let isViewCardWindowOpened = false
let isRemoveButtonVisible = false
let isReviewSectionOpened = false;
let currentCard = null
let selectedCardsToRemove = []
let allCards = []



// =========================
// API HELPER
// =========================

async function apiFetch(url, options = {}) {

    const response = await fetch(url, {
        credentials: "include",
        ...options
    })

    return response
}

async function viewCards(amount) {
    const viewCardsUrl = `http://localhost:8000/cards/cards/${amount}`;
    const cards = await apiFetch(viewCardsUrl);

    const json_response = await cards.json();

    return json_response;

}
// ============================================================
// GERENCIADOR DO PAINEL LATERAL DIREITO (RESUMO & DICAS)
// ============================================================

/**
 * Atualiza todas as estatísticas do painel de resumo de uma vez só.
 * @param {number} total - O número total de cards no deck.
 * @param {number} estudados - Quantos cards foram revisados hoje.
 * @param {number} acertos - Quantas respostas foram marcadas como corretas/boas.
 * @param {number} sequencia - Quantidade de dias seguidos estudando (streak).
 */
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

/**
 * Altera o texto da caixa de dicas para motivar ou instruir o usuário.
 * @param {string} novoTexto - A nova mensagem que será exibida.
 */
function alterarDica(novoTexto) {
    const elDica = document.querySelector('.tip-box .tip-text');
    
    if (elDica) {
        // Adiciona um efeito sutil de transição ao trocar o texto
        elDica.style.opacity = 0;
        
        setTimeout(() => {
            elDica.textContent = novoTexto;
            elDica.style.opacity = 1;
        }, 150);
    }
}

/**
 * Incrementa em +1 a quantidade de cards estudados hoje e gerencia os acertos.
 * Útil para ser chamada logo após o usuário clicar em um botão de dificuldade.
 * @param {boolean} foiAcerto - Passe 'true' se o usuário clicou em Bom/Fácil, ou 'false' se errou.
 */
function registrarRevisaoDoCard(foiAcerto) {
    const elEstudados = document.getElementById('stat-studied-today');
    const elAcertos = document.getElementById('stat-success-count');

    if (elEstudados) {
        let atualEstudados = parseInt(elEstudados.textContent) || 0;
        elEstudados.textContent = atualEstudados + 1;
    }

    if (foiAcerto && elAcertos) {
        let atualAcertos = parseInt(elAcertos.textContent) || 0;
        elAcertos.textContent = atualAcertos + 1;
    }
}

// =========================
// API FUNCTIONS
// =========================

// Return user info such as name, id, email, admin, current_streak...
async function getUserInfo() {

    const response =
        await apiFetch("http://localhost:8000/user/me")

    const info = await response.json()

    console.log(info)

    return info
}

// Call it when access_token gets expired.
async function refreshToken() {

    const response = await apiFetch(
        "http://localhost:8000/auth/refresh",
        {
            method: "POST"
        }
    )

    const result = await response.json()

    return result
}


async function verifyAuthentication() {

    const response = await apiFetch(
        "http://localhost:8000/auth/protected",
        {
            method: "POST"
        }
    )

    const authInfo = await response.json()

    return authInfo.authenticated
}

async function deleteCard(cardId) {
    const deleteCardsUrl = `http://localhost:8000/cards/delete_card/${cardId}`;
    const response = await apiFetch(deleteCardsUrl, {method: "DELETE"});

    const jsonResponse = await response.json();

    return jsonResponse;

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
        const response = await apiFetch("http://localhost:8000/cards/pick_card");
        const data = await response.json();
        const card = data.card;

        if (!card) {
            hideAllSections();
            emptyReviewSection.style.display = "block";
            currentCard = null;
            return;
        }

        // 3. Teleport our empty card frame onto the right side stage out of view
        flashcardItem.className = "prepare-right"; 
        cardInner.classList.remove("is-flipped"); // Reset face rotation angle

        // Force browser to register positioning layout change before updating visuals
        void flashcardItem.offsetWidth;

        // 4. Paint the text updates
        currentCard = card;
        questionField.textContent = card.front_content;
        answerField.textContent = card.back_content;

        // Reset control interface button wrappers
        // difficultyButtonsContainer.style.display = 'none';
        answerButton.style.display = 'block';

        // 5. Release card to glide smoothly back center stage
        flashcardItem.className = ""; 

    } catch (error) {
        console.error("Failed executing deck cycle step:", error);
    }
}

async function reviewCard(){
    const pickCardUrl = "http://localhost:8000/cards/pick_card";
    const response = await apiFetch(pickCardUrl)

    const jsonResponse = await response.json();
    const card = jsonResponse.card;


    if (!card){
        return null
    }

    console.log("FRONT CONTENT: ", card.front_content);

    currentCard = card

    questionField.textContent = card.front_content;
    answerField.textContent = card.back_content;

    return card
}

async function addCard(frontContent, backContent) {

    const response = await apiFetch(
        "http://localhost:8000/cards/add_card",
        {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                front_content: frontContent,
                back_content: backContent
            })
        }
    )

    const result = await response.json()

    console.log(result)

    return result
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
            console.log("empty review section is been displayed.")
            emptyReviewSection.style.display = "flex"
        } else {
            const response = await apiFetch("http://localhost:8000/cards/cards/999");

            const jsonResp = await response.json();

            allCards = jsonResp.cards;

            console.log(allCards)

            console.log("review section is been displayed.")
            reviewSection.style.display = "flex";
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

    const user = await getUserInfo()

    if (!user || !user.user_info || !user.user_info.name) {
        console.log("User information wasn't loaded properly.")
        return
    }

    userInfoElement.textContent =
        user.user_info.name
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

answerButton.addEventListener("click", () => {
    

    if (reviewBack.style.display != 'flex'){
        reviewBack.style.display = 'flex';
        difficultyButtons.style.display = 'flex';
    } else {
        reviewBack.style.display = 'none';
        difficultyButtons.style.display = 'none';
    }

});

reviewCardsButton.addEventListener("click", async() => {

    const hasCards = await reviewCard()
    toggleReviewSection(hasCards);
    
});

logoutButton.addEventListener("click", async () => {

    await fetch("http://localhost:8000/auth/logout", {
        method: "POST",
        credentials: "include"
    });

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

    if (!frontContent || !backContent) {

        console.log("Fields are empty.")

        return
    }

    console.log("Adding card...")

    const result =
        await addCard(frontContent, backContent)

    console.log(result)

    // Optional cleanup

    frontContentInput.value = ""
    backContentInput.value = ""
})


viewCardsButton.addEventListener("click", async () => {

    console.log("View cards clicked.")

    // await toggleRemoveCardsButton();

    const isViewWindowOpened = await toggleViewCardsSection();

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
        console.log("clicked");

        try {

            const difficulty = event.target.dataset.difficulty;

            console.log(difficulty);

            const cardID = currentCard.id;

            const updateCardUrl =
                `http://localhost:8000/cards/update_card?difficulty=${difficulty}&card_id=${cardID}`;

           
            
            const response = await apiFetch(updateCardUrl, {
                method: "POST",
                redirect: "manual"
            });

            const jsonResp = await response.json();

            console.log(jsonResp);

            fetchAndDisplayNextCard()

            reviewBack.style.display = 'none';
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
    atualizarProgresso(70)
})

