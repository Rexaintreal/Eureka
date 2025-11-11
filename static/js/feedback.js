let selectedRating = null;

const stars = document.querySelectorAll('.stars i');
const ratingText = document.getElementById('ratingText');
const ratingLabels = {
    1: 'Bad',
    2: 'Okish',
    3: 'Nice',
    4: 'Verrryy goood',
    5: 'OMG I LOVE THIS'
};

stars.forEach((star, index) => {
    star.addEventListener('mouseenter', () => {
        highlightStars(index);
    });
    star.addEventListener('click', () => {
        selectedRating = index + 1;
        selectStars(index);
        ratingText.textContent = ratingLabels[selectedRating];
    });
});

document.querySelector('.stars').addEventListener('mouseleave', () => {
    if (selectedRating !== null) {
        selectStars(selectedRating - 1);
    } else {
        resetStars();
    }
});

function highlightStars(index) {
    stars.forEach((star, i) => {
        if (i <= index) {
            star.classList.remove('far');
            star.classList.add('fas', 'hover');
        } else {
            star.classList.remove('fas', 'hover');
            star.classList.add('far');
        }
    });
}

function selectStars(index) {
    stars.forEach((star, i) => {
        if (i <= index) {
            star.classList.remove('far', 'hover');
            star.classList.add('fas', 'active');
        } else {
            star.classList.remove('fas', 'active', 'hover');
            star.classList.add('far');
        }
    });
}

function resetStars() {
    stars.forEach(star => {
        star.classList.remove('fas', 'active', 'hover');
        star.classList.add('far');
    });
}

const feedbackText = document.getElementById('feedbackText');
const charCount = document.getElementById('charCount');

feedbackText.addEventListener('input', () => {
    const count = feedbackText.value.length;
    charCount.textContent = count;
    if (count > 950) {
        charCount.style.color = '#f44336';
    } else if (count > 800) {
        charCount.style.color = '#ff9800';
    } else {
        charCount.style.color = 'rgba(255, 255, 255, 0.5)';
    }
});

const feedbackForm = document.getElementById('feedbackForm');
const submitBtn = document.getElementById('submitBtn');

feedbackForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const feedback = feedbackText.value.trim();
    const email = document.getElementById('emailInput').value.trim();
    
    if (!feedback) {
        showNotification('Please enter your feedback', 'error');
        return;
    }
    if (feedback.length > 1000) {
        showNotification('Feedback is too long (max 1000 characters)', 'error');
        return;
    }
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    try {
        const response = await fetch('/api/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                feedback: feedback,
                rating: selectedRating,
                email: email || null
            })
        });
        const data = await response.json();
        if (data.success) {
            feedbackForm.style.display = 'none';
            document.getElementById('successMessage').classList.add('active');
        } else {
            showNotification(data.error || 'Failed to submit feedback', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Feedback';
        }
    } catch (error) {
        console.error('Error submitting feedback:', error);
        showNotification('An error occurred. Please try again.', 'error');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Feedback';
    }
});

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    const icon = type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle';
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${icon}"></i>
        <span>${message}</span>
    `;
    notification.classList.add('show');
    setTimeout(() => {
        notification.classList.remove('show');
    }, 5000);
}

function resetForm() {
    feedbackForm.reset();
    feedbackForm.style.display = 'block';
    document.getElementById('successMessage').classList.remove('active');
    selectedRating = null;
    resetStars();
    ratingText.textContent = 'Select a rating';
    charCount.textContent = '0';
    charCount.style.color = 'rgba(255, 255, 255, 0.5)';
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Feedback';
    window.scrollTo({ top: 0, behavior: 'smooth' });
}