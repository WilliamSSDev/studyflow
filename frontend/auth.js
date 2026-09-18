const API_BASE_URL = window.location.port === "5500" ? "http://localhost:8000" : window.location.origin
const form = document.querySelector("form")
const errorMessage = document.getElementById("error-message")
const submitButton = form.querySelector("button[type=submit]")

function setTheme(theme) {
    document.body.classList.toggle("auth-dark", theme === "dark")
    localStorage.setItem("studyflow-theme", theme)
}

function readableError(data) {
    if (Array.isArray(data?.detail)) return "Confira os dados informados."
    if (data?.detail === "User already registered.") return "Este email já está cadastrado."
    if (data?.detail === "User not found") return "Email ou senha incorretos."
    return "Não foi possível concluir agora. Tente novamente."
}

document.getElementById("theme-toggle").addEventListener("click", () => {
    setTheme(document.body.classList.contains("auth-dark") ? "light" : "dark")
})
setTheme(localStorage.getItem("studyflow-theme") || "light")

form.addEventListener("submit", async event => {
    event.preventDefault()
    errorMessage.textContent = ""

    if (!form.checkValidity()) {
        errorMessage.textContent = "Preencha os campos obrigatórios."
        form.reportValidity()
        return
    }

    const isRegister = form.id === "register-form"
    const password = document.getElementById("password").value
    if (isRegister && password.length < 6) {
        errorMessage.textContent = "A senha precisa ter pelo menos 6 caracteres."
        return
    }
    if (isRegister && password !== document.getElementById("confirm-password").value) {
        errorMessage.textContent = "As senhas não coincidem."
        return
    }

    submitButton.disabled = true
    submitButton.textContent = isRegister ? "Criando..." : "Entrando..."
    try {
        const payload = isRegister
            ? { name: document.getElementById("username").value.trim(), email: document.getElementById("email").value.trim(), password }
            : { email: document.getElementById("email").value.trim(), password }
        const response = await fetch(`${API_BASE_URL}/auth/${isRegister ? "register" : "login"}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(payload),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(readableError(data))
        window.location.href = isRegister ? "login_page.html" : "index.html"
    } catch (error) {
        errorMessage.textContent = error.message || "Não foi possível conectar ao StudyFlow."
        submitButton.disabled = false
        submitButton.textContent = isRegister ? "Criar minha conta" : "Entrar"
    }
})
