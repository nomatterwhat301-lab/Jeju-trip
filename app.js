let places = JSON.parse(localStorage.getItem('jeju_places')) || [];
let map;

function initMap() {
    map = new kakao.maps.Map(document.getElementById('map'), {
        center: new kakao.maps.LatLng(33.3819, 126.5592),
        level: 9
    });
    render();
}

function render() {
    const container = document.getElementById('placeCards');
    container.innerHTML = '';
    places.forEach(p => {
        const div = document.createElement('div');
        div.className = 'place-card';
        div.innerHTML = `<h3>${p.name} (${p.picker})</h3><p>⭐ ${p.rating} | 🗳️ 투표: ${p.votes || 0}</p><button onclick="vote(${p.id})">투표하기</button>`;
        container.appendChild(div);
        new kakao.maps.Marker({ position: new kakao.maps.LatLng(p.lat, p.lng), map: map });
    });
}

window.vote = (id) => {
    const p = places.find(x => x.id === id);
    p.votes = (p.votes || 0) + 1;
    localStorage.setItem('jeju_places', JSON.stringify(places));
    render();
};

document.getElementById('placeForm').onsubmit = (e) => {
    e.preventDefault();
    places.push({
        id: Date.now(),
        name: document.getElementById('name').value,
        picker: document.getElementById('picker').value,
        rating: document.getElementById('rating').value,
        lat: parseFloat(document.getElementById('lat').value),
        lng: parseFloat(document.getElementById('lng').value),
        votes: 0
    });
    localStorage.setItem('jeju_places', JSON.stringify(places));
    document.getElementById('placeModal').style.display = 'none';
    render();
};

document.getElementById('addBtn').onclick = () => document.getElementById('placeModal').style.display = 'block';
window.onload = initMap;