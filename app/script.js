
"use strict";

// Find the theme button
const themeToggle = document.getElementById("themeToggle");

// Find the current year element
const currentYear = document.getElementById("currentYear");

// Find the JavaScript status message
const jsStatus = document.getElementById("jsStatus");


// Display the current year
currentYear.textContent = new Date().getFullYear();


// Confirm that JavaScript has loaded
jsStatus.textContent = "Interactive features loaded successfully";


// Theme toggle functionality
themeToggle.addEventListener("click", function () {

    const currentTheme =
        document.documentElement.getAttribute("data-theme");

    const newTheme =
        currentTheme === "dark" ? "light" : "dark";

    document.documentElement.setAttribute(
        "data-theme",
        newTheme
    );

    themeToggle.textContent =
        newTheme === "dark" ? "Light mode" : "Dark mode";

    themeToggle.setAttribute(
        "aria-pressed",
        newTheme === "light" ? "true" : "false"
    );

});

