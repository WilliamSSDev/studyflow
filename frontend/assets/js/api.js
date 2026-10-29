const API_BASE_URL = window.location.port === "5500"
    ? "http://localhost:8000"
    : window.location.origin

const selectDeckDropdown = document.querySelector("#decks");



export async function apiFetch(url, options = {}) {
    return fetch(url, {
        credentials: "include",
        ...options
    })
}

export async function viewCards(amount, deckId = null) {
    const query = deckId ? `?deck_id=${encodeURIComponent(deckId)}` : ""
    const response = await apiFetch(`${API_BASE_URL}/cards/cards/${amount}${query}`)
    return response.json()
}

export async function getUserInfo() {
    const response = await apiFetch(`${API_BASE_URL}/user/me`)
    return response.json()
}

export async function refreshToken() {
    const response = await apiFetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST"
    })
    return response.json()
}

export async function verifyAuthentication() {
    const response = await apiFetch(`${API_BASE_URL}/auth/protected`, {
        method: "POST"
    })
    const authInfo = await response.json()
    return authInfo.authenticated
}

export async function deleteCard(cardId) {
    const response = await apiFetch(
        `${API_BASE_URL}/cards/delete_card/${cardId}`,
        { method: "DELETE" }
    )
    return response.json()
}

export async function pickCard(deckId = null) {
    const query = deckId ? `?deck_id=${encodeURIComponent(deckId)}` : ""
    const response = await apiFetch(`${API_BASE_URL}/cards/pick_card${query}`)
    return response.json()
}


export async function getCardsInfo() {
    try {
        const response = await apiFetch(`${API_BASE_URL}/cards/me`)

        if (!response.ok) {
            throw new Error(`Erro na API. Status HTTP: ${response.status}`)
        }

        return await response.json()
    } catch (error) {
        console.error("Falha crítica ao buscar informações do usuário:", error.message)
        return {
            total_cards: 0,
            studied_today: 0,
            correct_today: 0,
            current_streak: 0
        }
    }
}

export async function updateCardDifficulty(cardId, difficulty) {
    const response = await apiFetch(
        `${API_BASE_URL}/cards/update_card?difficulty=${difficulty}&card_id=${cardId}`,
        {
            method: "POST",
            redirect: "manual"
        }
    )
    return response.json()
}

export async function logout() {
    return apiFetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST"
    })
}

if (selectDeckDropdown) {
    selectDeckDropdown.addEventListener("change", () => {
        const selectedDeck = selectDeckDropdown.value;
        console.log(selectedDeck);
    });
}

export async function listDecks() {
    const response = await apiFetch(`${API_BASE_URL}/decks`)

    if (!response.ok) throw new Error("Não foi possível carregar os decks.")

    const decks = await response.json();

    if (selectDeckDropdown) {

        decks.forEach(deck => {

            const newOption = document.createElement('option');

            newOption.value = deck.id;
            newOption.textContent = deck.name;

            selectDeckDropdown.appendChild(newOption);
            
        });
    }
    // console.log(selectDeckDropdown.value)
    return decks
}

export async function addCard(frontContent, backContent, deckId = null) {
    // if (!deckId){
    //     deckId = selectDeckDropdown.value;
    // }
    const response = await apiFetch(`${API_BASE_URL}/cards/add_card`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            front_content: frontContent,
            back_content: backContent,
            deck_id: deckId
        })
    })
    const data = await response.json();
    console.log("response", data);

    if (!response.ok) {
        throw new Error(data.detail || "Erro ao salvar o flashcard.");
    }

    return data;
    }

export async function createDeck(name, description = "") {
    const response = await apiFetch(`${API_BASE_URL}/decks/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description })
    })
    if (!response.ok) throw new Error("Não foi possível criar o deck.")
    return response.json()
}

export async function getDeck(deckId) {
    const response = await apiFetch(`${API_BASE_URL}/decks/${deckId}`)
    if (!response.ok) throw new Error("Não foi possível carregar o deck.")
    return response.json()
}

export async function getDeckCards(deckId) {
    const response = await apiFetch(`${API_BASE_URL}/decks/${deckId}/cards`)
    if (!response.ok) throw new Error("Não foi possível carregar os cards.")
    return response.json()
}

export async function getReviewActivity(days = 7) {
    const response = await apiFetch(`${API_BASE_URL}/cards/reviews_period?days_period=${days}`)
    if (!response.ok) throw new Error("Não foi possível carregar a atividade.")
    return response.json()
}

export { API_BASE_URL }
