login_button = document.getElementById("login-button")
signup_button = document.getElementById("signup-button")


login_button.addEventListener("click", function() {
    return window.location.href = "login_page.html";
});

signup_button.addEventListener("click", function() {
    return window.location.href = "register_page.html";
});

