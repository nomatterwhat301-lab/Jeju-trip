let map;
let places = JSON.parse(localStorage.getItem('jeju_places')) || [];
let markers = [];
const ps = new kakao.maps.services.Places();

// 지도 초기화
function initMap() {
    map = new kakao.maps.Map(document.getElementById('map'), {
        center: new kakao.maps.LatLng(33.3819, 126.5592),
        level: 9
    });
    renderPlaces();
}

// 햄버거 메뉴 열고 닫기
const sidePanel = document.getElementById('sidePanel');
document.getElementById('menuBtn').onclick = () => sidePanel.classList.add('active');
document.getElementById('closeBtn').onclick = () => sidePanel.classList.remove('active');

// 버튼형 선택 UI 로직 처리 (일정, 카테고리, 픽한사람, 투표)
function setupButtonGroup(containerId, inputId, isMulti = false) {
    const buttons = document.querySelectorAll(`#${containerId} button`);
    buttons.forEach(btn => {
        btn.onclick = () => {
            if (!isMulti) {
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (inputId) document.getElementById(inputId).value = btn.dataset.value || btn.dataset.name;
            } else {
                btn.classList.toggle('active');
            }
        };
    });
}
setupButtonGroup('scheduleGroup', 'selectedSchedule');
setupButtonGroup('categoryGroup', 'selectedCategory');
setupButtonGroup('pickerGroup', 'selectedPicker');
setupButtonGroup('votersGroup', null, true); // 투표는 다중 선택 가능

// 카카오 키워드 검색
function searchPlaceKeyword() {
    const keyword = document.getElementById('searchInput').value;
    if (!keyword.trim()) {
        alert('검색어를 입력해주세요!');
        return;
    }
    ps.keywordSearch(keyword, (data, status) => {
        if (status === kakao.maps.services.Status.OK) {
            const coords = new kakao.maps.LatLng(data[0].y, data[0].x);
            map.setCenter(coords);
            document.getElementById('placeName').value = data[0].place_name;
            document.getElementById('lat').value = data[0].y;
            document.getElementById('lng').value = data[0].x;
            alert(`"${data[0].place_name}" 위치를 불러왔습니다!`);
        } else {
            alert('검색 결과가 없습니다.');
        }
    });
}

// 숙소와의 거리 계산 (하바사인 공식)
function calcDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2)**2;
    return (2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))).toFixed(1);
}

// 카테고리별 이모지 매칭
function getEmoji(cat) {
    if (cat === 'lodging') return '🏠';
    if (cat === 'restaurant') return '🥢';
    if (cat === 'cafe') return '☕';
    if (cat === 'tour') return '🌴';
    return '📍';
}

// 렌더링 및 마커 표시
function renderPlaces() {
    const container = document.getElementById('cardsList');
    container.innerHTML = '';
    markers.forEach(m => m.setMap(null));
    markers = [];

    const lodging = places.find(p => p.category === 'lodging');

    places.forEach(p => {
        const emoji = getEmoji(p.category);
        const dist = (lodging && p.category !== 'lodging') ? calcDistance(lodging.lat, lodging.lng, p.lat, p.lng) : null;

        // 카드 UI
        const card = document.createElement('div');
        card.className = 'card-item';
        card.innerHTML = `
            <h3><span>${emoji} ${p.name}</span> <span style="font-size:0.75rem; color:#888;">${p.schedule}</span></h3>
            <div style="font-size:0.8rem; color:#555; line-height:1.3;">
                ⭐ ${p.rating}점 | 픽: <b>${p.picker}</b><br>
                예약: ${p.reservation || '없음'} | 노키즈: ${p.noKids === 'yes' ? '🚫 YES' : '✔️ NO'}<br>
                운영: ${p.hours || '-'} / 휴무: ${p.closedDay || '-'}<br>
                ${dist ? `📍 숙소로부터 약 <b>${dist}km</b><br>` : ''}
                메모: ${p.memo || '없음'}<br>
                ❤️ 투표한 가족: ${(p.voters || []).join(', ') || '없음'}
            </div>
            <div class="card-actions">
                <button onclick="editPlace(${p.id})">수정</button>
                <button onclick="deletePlace(${p.id})" style="color:#ff3b30;">삭제</button>
            </div>
        `;
        container.appendChild(card);

        // 지도 마커
        if (p.lat && p.lng) {
            const marker = new kakao.maps.CustomOverlay({
                position: new kakao.maps.LatLng(p.lat, p.lng),
                content: `<div style="background:white; padding:3px 8px; border-radius:12px; border:2px solid #007aff; font-size:11px; font-weight:bold;">${emoji} ${p.name}</div>`,
                yAnchor: 1.5
            });
            marker.setMap(map);
            markers.push(marker);
        }
    });
}

// 장소 저장 및 수정 처리
document.getElementById('placeForm').onsubmit = (e) => {
    e.preventDefault();
    const name = document.getElementById('placeName').value;
    const lat = document.getElementById('lat').value;
    const lng = document.getElementById('lng').value;

    if (!lat || !lng) {
        alert('장소 검색을 통해 지도 위치를 먼저 지정해주세요!');
        return;
    }

    // 체크박스 예약 수단 수집
    const resChecked = Array.from(document.querySelectorAll('input[name="res"]:checked')).map(el => el.value);
    // 투표한 가족 수집
    const activeVoters = Array.from(document.querySelectorAll('#votersGroup .vote-tag.active')).map(el => el.dataset.name);

    const editId = document.getElementById('placeForm').dataset.editId;
    const placeData = {
        id: editId ? Number(editId) : Date.now(),
        schedule: document.getElementById('selectedSchedule').value,
        category: document.getElementById('selectedCategory').value,
        picker: document.getElementById('selectedPicker').value,
        name: name,
        lat: Number(lat),
        lng: Number(lng),
        rating: document.getElementById('rating').value,
        reservation: resChecked.join(', '),
        hours: document.getElementById('hours').value,
        breakTime: document.getElementById('breakTime').value,
        closedDay: document.getElementById('closedDay').value,
        noKids: document.querySelector('input[name="noKids"]:checked').value,
        memo: document.getElementById('memo').value,
        voters: activeVoters
    };

    if (editId) {
        const idx = places.findIndex(p => p.id == editId);
        places[idx] = placeData;
        delete document.getElementById('placeForm').dataset.editId;
    } else {
        places.push(placeData);
    }

    localStorage.setItem('jeju_places', JSON.stringify(places));
    sidePanel.classList.remove('active');
    document.getElementById('placeForm').reset();
    renderPlaces();
};

window.deletePlace = (id) => {
    if (confirm('정말 삭제하시겠습니까?')) {
        places = places.filter(p => p.id !== id);
        localStorage.setItem('jeju_places', JSON.stringify(places));
        renderPlaces();
    }
};

window.editPlace = (id) => {
    const p = places.find(x => x.id === id);
    if (!p) return;

    document.getElementById('placeName').value = p.name;
    document.getElementById('lat').value = p.lat;
    document.getElementById('lng').value = p.lng;
    document.getElementById('rating').value = p.rating;
    document.getElementById('hours').value = p.hours;
    document.getElementById('breakTime').value = p.breakTime;
    document.getElementById('closedDay').value = p.closedDay;
    document.getElementById('memo').value = p.memo;

    document.getElementById('placeForm').dataset.editId = id;
    sidePanel.classList.add('active');
};

window.onload = initMap;