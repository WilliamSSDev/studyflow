import {
    addCard,
    createDeck,
    deleteCard,
    getCardsInfo,
    getDeckCards,
    getUserInfo,
    listDecks,
    logout,
    pickCard,
    refreshToken,
    updateCardDifficulty,
    verifyAuthentication,
    getReviewActivity,
} from "./api.js"
import { createActivityChart } from "../../charts.js"

const elements = {
    userInfo: document.getElementById("user-info"),
    themeToggle: document.getElementById("theme-toggle"),
    decksPanel: document.getElementById("decks-panel"),
    deckGrid: document.getElementById("deck-grid"),
    emptyDecks: document.getElementById("empty-decks"),
    newDeckButton: document.getElementById("new-deck-button"),
    emptyNewDeckButton: document.getElementById("empty-new-deck-button"),
    deckWorkspace: document.getElementById("deck-workspace"),
    backToDecks: document.getElementById("back-to-decks"),
    activeDeckName: document.getElementById("active-deck-name"),
    activeDeckDescription: document.getElementById("active-deck-description"),
    deckStats: document.getElementById("deck-stats"),
    deckCardList: document.getElementById("deck-card-list"),
    workspaceStudyButton: document.getElementById("workspace-study-button"),
    workspaceAddButton: document.getElementById("workspace-add-button"),
    addCardSection: document.getElementById("add-card-section"),
    cancelAddCard: document.getElementById("cancel-add-card"),
    editorDeckName: document.getElementById("editor-deck-name"),
    cardForm: document.getElementById("card-form"),
    frontContent: document.getElementById("front-content"),
    backContent: document.getElementById("back-content"),
    flashcardItem: document.getElementById("flashcard-item"),
    cardInner: document.getElementById("card-inner"),
    questionField: document.getElementById("review-front-content"),
    answerField: document.getElementById("review-back-content"),
    answerButton: document.getElementById("show-answer-button"),
    difficultyButtons: document.getElementById("difficulty-buttons"),
    reviewSection: document.getElementById("review-section"),
    emptyReviewSection: document.getElementById("empty-review-section"),
    progressStatus: document.getElementById("progress-status"),
    progressText: document.querySelector(".progress-text"),
    progressCircle: document.querySelector(".fg-circle"),
    logoutButton: document.getElementById("logout-button"),
    deckModal: document.getElementById("deck-modal"),
    deckForm: document.getElementById("deck-form"),
    closeDeckModal: document.getElementById("close-deck-modal"),
    newDeckName: document.getElementById("new-deck-name"),
    newDeckDescription: document.getElementById("new-deck-description"),
    toastRegion: document.getElementById("toast-region"),
    todayStudied: document.getElementById("today-studied"),
    todayPending: document.getElementById("today-pending"),
    todaySuccess: document.getElementById("today-success"),
    legacyAddButton: document.getElementById("open-add-card"),
    legacyReviewButton: document.getElementById("review-cards"),
    statisticsButton: document.getElementById("statistics"),
    activityAverage: document.getElementById("activity-average"),
    activityChart: document.getElementById("activityChart"),
    legacyViewCardsButton: document.getElementById("view-cards"),
    inicioButton: document.getElementById("home-link"),
}

const state = {
    activeDeck: null,
    currentCard: null,
    isFlipped: false,
    decks: [],
    isSaving: false,
}

const allowedTags = new Set(["B", "BR", "EM", "I", "LI", "OL", "P", "STRONG", "U", "UL"])
let activityChart

function sanitizeHtml(value) {
    const template = document.createElement("template")
    template.innerHTML = value
    const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_ELEMENT)
    const elementsToRemove = []

    while (walker.nextNode()) {
        const node = walker.currentNode
        if (!allowedTags.has(node.tagName)) {
            elementsToRemove.push(node)
        } else {
            for (const attribute of [...node.attributes]) {
                node.removeAttribute(attribute.name)
            }
        }
    }

    for (const node of elementsToRemove) {
        node.replaceWith(document.createTextNode(node.textContent || ""))
    }

    return template.innerHTML.trim()
}

function showToast(message, type = "success") {
    const toast = document.createElement("div")
    toast.className = `toast ${type}`
    toast.textContent = message
    elements.toastRegion.appendChild(toast)
    window.setTimeout(() => toast.remove(), 3600)
}

function setTheme(theme) {
    document.body.classList.toggle("theme-dark", theme === "dark")
    localStorage.setItem("studyflow-theme", theme)
    elements.themeToggle.innerHTML = theme === "dark"
        ? '<i class="fa-solid fa-sun"></i>'
        : '<i class="fa-solid fa-moon"></i>'
    elements.themeToggle.setAttribute(
        "aria-label",
        theme === "dark" ? "Usar tema claro" : "Usar tema escuro"
    )
}

function renderSummary(stats) {
    const values = {
        "stat-total-cards": stats.total_cards ?? 0,
        "stat-studied-today": stats.studied_today ?? 0,
        "stat-success-count": stats.correct_today ?? 0,
        "stat-streak-days": stats.current_streak ?? 0,
    }
    for (const [id, value] of Object.entries(values)) {
        const element = document.getElementById(id)
        if (element) element.textContent = value
    }
    elements.todayStudied.textContent = stats.studied_today ?? 0
    elements.todaySuccess.textContent = stats.correct_today ?? 0
}

function renderDecks() {
    elements.deckGrid.innerHTML = ""
    elements.emptyDecks.hidden = state.decks.length > 0

    for (const deck of state.decks) {
        const card = document.createElement("article")
        card.className = "deck-card"
        card.tabIndex = 0
        const progress = deck.total_cards
            ? Math.min(100, Math.round((deck.studied_cards / deck.total_cards) * 100))
            : 0
        card.innerHTML = `
            <div>
                <div class="deck-card-top">
                    <span class="deck-card-icon"><i class="fa-solid fa-layer-group"></i></span>
                    <span class="deck-count">${deck.total_cards} cards</span>
                </div>
                <h3 class="deck-name"></h3>
                <p></p>
                <div class="deck-progress" aria-label="${progress}% estudado"><span style="width: ${progress}%"></span></div>
            </div>
            <div class="deck-card-footer">
                <span class="deck-card-meta">${deck.pending_cards} para revisar</span>
                <span class="deck-card-meta">Abrir <i class="fa-solid fa-arrow-right"></i></span>
            </div>
        `
        card.querySelector(".deck-name").textContent = deck.name
        card.querySelector("p").textContent = deck.description || "Organize seus próximos estudos."
        card.addEventListener("click", () => openDeck(deck.id))
        card.addEventListener("keydown", event => {
            if (event.key === "Enter" || event.key === " ") openDeck(deck.id)
        })
        elements.deckGrid.appendChild(card)
    }
}

function renderDeckStats(deck) {
    const stats = [
        [deck.total_cards, "flashcards"],
        [deck.pending_cards, "pendentes"],
        [deck.studied_cards, "estudados hoje"],
    ]
    elements.deckStats.innerHTML = stats.map(([value, label]) => `
        <div class="deck-stat"><strong>${value}</strong><span>${label}</span></div>
    `).join("")
}


function renderDeckCards(cards) {
    if (!cards.length) {
        elements.deckCardList.innerHTML = '<div class="empty-decks"><i class="fa-regular fa-note-sticky"></i><h3>Este deck ainda está vazio</h3><p>Adicione seu primeiro flashcard para começar.</p></div>'
        return
    }

    elements.deckCardList.innerHTML = cards.map(card => `
        <article class="deck-card-row" data-card-id="${card.id}">
            <div><h3></h3><p></p></div>
            <div class="deck-card-actions"><button class="back-button delete-card" type="button" aria-label="Excluir flashcard"><i class="fa-regular fa-trash-can"></i></button></div>
        </article>
    `).join("")

    cards.forEach(card => {
        const row = elements.deckCardList.querySelector(`[data-card-id="${card.id}"]`)
        row.querySelector("h3").innerHTML = sanitizeHtml(card.front_content)
        row.querySelector("p").innerHTML = sanitizeHtml(card.back_content)
        row.querySelector(".delete-card").addEventListener("click", async () => {
            if (!window.confirm("Excluir este flashcard?")) return
            try {
                await deleteCard(card.id)
                showToast("Flashcard excluído.")
                await openDeck(state.activeDeck.id)
            } catch {
                showToast("Não foi possível excluir o flashcard.", "error")
            }
        })
    })
}

function hideMainSections() {
    document.querySelectorAll(".view-cards-window, .statistics-section, .review-section, .empty-review-section, .add-card-section").forEach(section => {
        section.style.display = "none"
    })
}

function showDecks() {
    hideMainSections()
    elements.deckWorkspace.hidden = true
    elements.decksPanel.hidden = false
    state.activeDeck = null
}

async function openDeck(deckId) {
    try {
        const data = await getDeckCards(deckId)
        state.activeDeck = data.deck
        hideMainSections()
        elements.decksPanel.hidden = true
        elements.deckWorkspace.hidden = false
        elements.activeDeckName.textContent = data.deck.name
        elements.activeDeckDescription.textContent = data.deck.description || ""
        renderDeckStats(data.deck)
        renderDeckCards(data.cards)
    } catch {
        showToast("Não foi possível abrir este deck.", "error")
    }
}

function showEditor() {
    if (!state.activeDeck) {
        showToast("Abra um deck antes de criar um flashcard.", "error")
        return
    }
    hideMainSections()
    elements.decksPanel.hidden = true
    elements.deckWorkspace.hidden = true
    elements.addCardSection.style.display = "block"
    elements.editorDeckName.textContent = state.activeDeck.name
    elements.frontContent.focus()
}

function closeEditor() {
    elements.addCardSection.style.display = "none"
    if (state.activeDeck) openDeck(state.activeDeck.id)
    else showDecks()
}

function updateStudyProgress(cardsToReview, studiedToday = 0) {
    const safeTotal = Math.max(cardsToReview || 0, studiedToday || 0, 1)
    const percentage = Math.min(100, Math.round((studiedToday / safeTotal) * 100))
    elements.progressStatus.textContent = `${studiedToday} / ${cardsToReview || 0}`
    elements.progressText.textContent = `${percentage}%`
    elements.progressCircle.style.strokeDashoffset = 314 - (314 * percentage / 100)
}

function renderStudyCard(card) {
    state.currentCard = card
    state.isFlipped = false
    elements.cardInner.classList.remove("is-flipped")
    elements.difficultyButtons.style.display = "none"
    elements.answerButton.style.display = "block"
    elements.questionField.innerHTML = sanitizeHtml(card.front_content)
    elements.answerField.innerHTML = sanitizeHtml(card.back_content)
}

async function startStudy() {
    // print("Starting study session...")
    // renderSummary(await getCardsInfo())
    // showToast("Iniciando sessão de estudo...")
    if (!state.activeDeck) {
        showToast("Abra um deck antes de iniciar a sessão de estudo.", "error")
        return
    }
    hideMainSections()
    elements.decksPanel.hidden = true
    elements.deckWorkspace.hidden = true
    elements.reviewSection.style.display = "block"
    try {
        const data = await pickCard(state.activeDeck.id)
        // showToast(`Sessão de estudo iniciada. ${data.cards_to_review} cards para revisar.`)
        if (!data.card) {
            elements.reviewSection.style.display = "none"
            elements.emptyReviewSection.style.display = "block"
            updateStudyProgress(0, 0)
            return
        }
        renderStudyCard(data.card)
        const stats = await getCardsInfo()
        renderSummary(stats)
        updateStudyProgress(data.cards_to_review, stats.studied_today)
    } catch {
        showToast("Não foi possível iniciar a sessão.", "error")
    }
}

async function answerStudyCard(difficulty) {
    if (!state.currentCard) return
    const buttons = [...elements.difficultyButtons.querySelectorAll("button")]
    buttons.forEach(button => { button.disabled = true })
    try {
        await updateCardDifficulty(state.currentCard.id, difficulty)
        showToast("Resposta registrada.")
        await startStudy()
    } catch {
        showToast("Não foi possível registrar sua resposta.", "error")
    } finally {
        buttons.forEach(button => { button.disabled = false })
    }
}

function bindEditorToolbar() {
    document.querySelectorAll(".editor-toolbar button").forEach(button => {
        button.addEventListener("mousedown", event => event.preventDefault())
        button.addEventListener("click", () => {
            const target = document.getElementById(button.closest(".editor-toolbar").dataset.target)
            target.focus()
            document.execCommand(button.dataset.command, false)
        })
    })
}

function openDeckModal() {
    elements.deckModal.hidden = false
    elements.newDeckName.focus()
}

function closeDeckModal() {
    elements.deckModal.hidden = true
    elements.deckForm.reset()
}

async function loadDashboard() {
    state.decks = await listDecks()
    renderDecks()
    const stats = await getCardsInfo()
    renderSummary(stats)
    elements.todayPending.textContent = state.decks.reduce((total, deck) => total + (deck.pending_cards || 0), 0)
    await loadActivity()
}

async function loadActivity() {
    const activity = await getReviewActivity(7)
    const today = new Date()
    const labels = []
    const values = []
    for (let offset = 6; offset >= 0; offset -= 1) {
        const date = new Date(today)
        date.setDate(today.getDate() - offset)
        const key =
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
        labels.push(offset === 0 ? "Hoje" : date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""))
        values.push(activity[key] || 0)
    }
    elements.activityAverage.textContent = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
    activityChart?.destroy()
    console.log("Creating activity chart with labels:", labels, "and values:", values)
    activityChart = createActivityChart(elements.activityChart, labels, values)
}

async function authenticate() {
    console.log("Verifying user authentication...");

    try {
        if (await verifyAuthentication()) {
            return true;
        }

        const refreshed = await refreshToken();

        if (refreshed.authenticated) {
            return true;
        }

        window.location.href = "login_page.html";
        return false;

    } catch (error) {
        console.error("Authentication request failed:", error);

        window.location.href = "login_page.html";
        return false;
    }
}

async function initialize() {
    setTheme(localStorage.getItem("studyflow-theme") || "light")
    bindEditorToolbar()

    if (!(await authenticate())) return
    const user = await getUserInfo()
    console.log("User info:", user)
    elements.userInfo.textContent = user?.nome || "Estudante"
    await loadDashboard()

    elements.themeToggle.addEventListener("click", () => {
        setTheme(document.body.classList.contains("theme-dark") ? "light" : "dark")
    })
    elements.newDeckButton.addEventListener("click", openDeckModal)
    elements.emptyNewDeckButton.addEventListener("click", openDeckModal)
    elements.closeDeckModal.addEventListener("click", closeDeckModal)
    elements.deckModal.addEventListener("click", event => {
        if (event.target === elements.deckModal) closeDeckModal()
    })
    elements.backToDecks.addEventListener("click", showDecks)
    elements.workspaceAddButton.addEventListener("click", () => { window.location.href = "add_card.html"; })
    elements.workspaceStudyButton.addEventListener("click", startStudy)
    elements.legacyAddButton.addEventListener("click", () => {
        if (!state.activeDeck) {
            showToast("Abra um deck antes de criar um flashcard.", "error")
            return
        }
        window.location.href = "add_card.html";
    })
    elements.legacyReviewButton.addEventListener("click", startStudy)
    // elements.statisticsButton.addEventListener("click", () => document.getElementById("activity-panel").scrollIntoView({ behavior: "smooth" }))
    elements.statisticsButton.addEventListener("click", () => {

        if (!activityChart) {
            loadActivity().catch(() => showToast("Não foi possível carregar as estatísticas.", "error"))
        } else {
            window.location.href = "statistics.html"
        }
        
    })
    // elements.cancelAddCard.addEventListener("click", closeEditor)
    elements.answerButton.addEventListener("click", () => {
        state.isFlipped = !state.isFlipped
        elements.cardInner.classList.toggle("is-flipped", state.isFlipped)
        elements.difficultyButtons.style.display = state.isFlipped ? "flex" : "none"
    })
    elements.difficultyButtons.querySelectorAll("button").forEach(button => {
        button.addEventListener("click", () => answerStudyCard(button.dataset.difficulty))
    })
    elements.logoutButton.addEventListener("click", async () => {
        await logout()
        window.location.href = "login_page.html"
    })
    elements.cardForm.addEventListener("submit", saveCard)
    elements.deckForm.addEventListener("submit", saveDeck)

    document.addEventListener("keydown", event => {
        if (event.target.isContentEditable || ["INPUT", "TEXTAREA"].includes(event.target.tagName)) return
        if (event.code === "Space" && state.currentCard) {
            event.preventDefault()
            elements.answerButton.click()
        }
        if (state.isFlipped && ["1", "2", "3", "4"].includes(event.key)) {
            const difficulty = ["hard", "medium", "good", "easy"][Number(event.key) - 1]
            answerStudyCard(difficulty)
        }
    })
    
}

async function saveDeck(event) {
    event.preventDefault()
    const name = elements.newDeckName.value.trim()
    if (!name) return
    try {
        await createDeck(name, elements.newDeckDescription.value.trim())
        closeDeckModal()
        await loadDashboard()
        showToast("Deck criado com sucesso.")
    } catch {
        showToast("Não foi possível criar o deck.", "error")
    }
}

async function saveCard(event) {
    event.preventDefault()

    const dropdown = document.querySelector("#decks");
    const deckId = Number(dropdown?.value);

    if (state.isSaving) return;

    if (!deckId) {
        showToast("Selecione um deck.", "error");
        return;
    }
    const front = sanitizeHtml(elements.frontContent.innerHTML)
    const back = sanitizeHtml(elements.backContent.innerHTML)
    if (!front || !back) {
        showToast("Preencha o front e o back do flashcard.", "error")
        return
    }
    state.isSaving = true
    const button = elements.cardForm.querySelector(".save-card-button")
    button.disabled = true
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Salvando...'
    try {
        await addCard(front, back, deckId)
        elements.frontContent.innerHTML = ""
        elements.backContent.innerHTML = ""
        showToast("Flashcard criado com sucesso.")
        // closeEditor()
    } catch {
        showToast("Não foi possível salvar o flashcard.", "error")
    } finally {
        state.isSaving = false
        button.disabled = false
        button.innerHTML = '<i class="fa-solid fa-check"></i> Salvar flashcard'
    }
}
initialize().catch((error) => {
    console.error("Erro ao inicializar:", error);
    showToast("Não foi possível carregar o StudyFlow.", "error");
});
