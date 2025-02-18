document.addEventListener('DOMContentLoaded', () => {
    // 카드에 호버 효과 추가
    const cards = document.querySelectorAll('.card');

    cards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-10px)';
            card.style.transition = 'transform 0.3s ease';
        });

        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
        });
    });

    // 페이지 로드 시 페이드인 효과
    document.querySelector('.main-container').style.opacity = '0';
    setTimeout(() => {
        document.querySelector('.main-container').style.opacity = '1';
        document.querySelector('.main-container').style.transition = 'opacity 0.5s ease';
    }, 100);
});