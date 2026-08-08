let map;
let markers = [];
let places = JSON.parse(localStorage.getItem('jeju_places')) || [];
const ps = new kakao.maps.services.Places();

// 카카오 지도 초기화
function initMap() {
    const container = document.getElementById('map');
    const options = {
        center: new kakao.maps.LatLng(33.3819, 126.5592), // 제주도 중심
        level: 9
    };
    map = new kakao.maps.Map(container, options);
    renderPlaces();
}

// 숙소 좌표 찾기 (거리 계산용)
function getLodgingCoord() {
    const lodging = places.find(p => p.category === 'lodging');
    return lodging ? { lat: lodging.lat, lng: lodging.lng } : null;
}

// 하바사인 공식으로 거리 계산 (km 단위)
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
}

// 카테고리별 이모지 및 마커 텍스트 매칭
function getCategoryInfo(cat) {
    switch(cat) {
        case 'lodging': return { name: '집(숙소)', emoji: '🏠' };
        case 'restaurant': return { name: '음식점', emoji: '🥢' };
        case 'cafe': return { name: '카페', emoji: '☕' };
        case 'tour': return { name: '관광지', emoji: '🌴' };
        default: return { name: '기타', emoji: '📍' };
    }
}

// 장소 목록 및 지도 마커 렌더링
function renderPlaces() {
    const container = document.getElementById('placeCards');
    const dayFilter = document.getElementById('dayFilter').value;
    const categoryFilter = document.getElementById('categoryFilter').value;

    container.innerHTML = '';
    
    // 기존 마커 지도에서 제거
    markers.forEach(m => m.setMap(null));
    markers = [];

    const lodgingCoord = getLodgingCoord();

    const filtered = places.filter(p => {
        if (dayFilter !== 'all' && p.schedule !== dayFilter) return false;
        if (categoryFilter !== 'all' && p.category !== categoryFilter) return false;
        return true;
    });

    filtered.forEach(p => {
        const info = getCategoryInfo(p.category);
        const dist = (lodgingCoord && p.category !== 'lodging') ? 
            calculateDistance(lodgingCoord.lat, lodgingCoord.lng, p.lat, p.lng) : null;

        // 1. 카드 UI 생성
        const card = document.createElement('div');
        card.className = 'place-card';
        card.innerHTML = `
            <h3>
                <span>${info.emoji} ${p.name}</span>
                <span class="badge ${p.category}">${info.name}</span>
            </h3>
            <div class="place-info">
                ⭐ ${p.rating}점 | 픽: <b>${p.picker}</b> (${p.schedule.replace('day', '')}일차)<br>
                🕒 ${p.hours || '영업시간 정보 없음'}<br>
                📌 예약: ${p.reservation || '정보 없음'} ${p.noKids ? '| 🚫 노키즈존' : ''}<br>
                💬 ${p.memo || '메모 없음'}<br>
                ${dist ? `📍 숙소로부터 약 <b>${dist}km</b>` : ''}
            </div>
            <div class="place-footer">
                <span>❤️ 투표: <b>${p.votes || 0}</b></span>
                <div class="action-links">
                    <button onclick="votePlace(${p.id})" class="vote-btn">투표하기</button>
                    <button onclick="editPlace(${p.id})">수정</button>
                    <button onclick="deletePlace(${p.id})" style="color:#ff3b30;">삭제</button>
                </div>
            </div>
        `;
        container.appendChild(card);

        // 2. 지도 마커 생성 (이모지를 활용한 커스텀 오버레이 또는 기본 마커)
        if (p.lat && p.lng) {
            const markerPosition = new kakao.maps.LatLng(p.lat, p.lng);
            
            // HTML 커스텀 마커로 이모지 표시
            const content = `<div style="background:white; padding:4px 8px; border-radius:15px; border:2px solid #007aff; font-size:12px; font-weight:bold; box-shadow:0 2px 4px rgba(0,0,0,0.2);">${info.emoji} ${p.name}</div>`;
            const customOverlay = new kakao.maps.CustomOverlay({
                position: markerPosition,
                content: content,
                yAnchor: 1.5
            });
            customOverlay.setMap(map);
            markers.push(customOverlay);
        }
    });
}

// 🔍 카카오 장소 검색 기능
function searchPlaces() {
    const keyword = document.getElementById('searchInput').value;
    if (!keyword.trim()) {
        alert('검색어를 입력해 주세요!');
        return;
    }

    ps.keywordSearch(keyword, (data, status) => {
        if (status === kakao.maps.services.Status.OK) {
            // 검색된 첫 번째 장소로 지도 중심 이동
            const coords = new kakao.maps.LatLng(data[0].y, data[0].x);
            map.setCenter(coords);

            // 바로 모달을 열어 장소 등록 준비
            openModalForAdd(data[0].place_name, data[0].y, data[0].x);
        } else {
            alert('검색 결과가 없습니다. 다른 검색어로 시도해 보세요.');
        }
    });
}

// 모달 제어 (추가 모드)
function openModalForAdd(name, lat, lng) {
    document.getElementById('modalTitle').innerText = '새 장소 등록하기';
    document.getElementById('placeForm').reset();
    document.getElementById('modalLat').value = lat;
    document.getElementById('modalLng').value = lng;
    document.getElementById('modalName').value = name;
    modal.style.display = 'block';
}

// 햄버거 메뉴 열기/닫기
const sideMenu = document.getElementById('sideMenu');
document.getElementById('menuBtn').onclick = () => sideMenu.classList.add('active');
document.getElementById('closeMenuBtn').onclick = () => sideMenu.classList.remove('active');
document.getElementById('addPlaceBtn').onclick = () => {
    sideMenu.classList.remove('active');
    // 사용자가 직접 좌표를 지정해 추가할 수 있도록 지도 중심 좌표 활용
    const center = map.getCenter();
    openModalForAdd('새로운 장소 (이름수정)', center.getLat(), center.getLng());
    document.getElementById('modalName').removeAttribute('readonly'); // 직접 수정 가능하게
};

// 투표 기능
window.votePlace = function(id) {
    const place = places.find(p => p.id === id);
    if (place) {
        place.votes = (place.votes || 0) + 1;
        saveAndReload();
    }
};

// 삭제 기능
window.deletePlace = function(id) {
    if (confirm('이 장소를 목록에서 삭제하시겠습니까?')) {
        places = places.filter(p => p.id !== id);
        saveAndReload();
    }
};

// 수정 기능
window.editPlace = function(id) {
    const p = places.find(x => x.id === id);
    if (!p) return;

    document.getElementById('modalTitle').innerText = '장소 정보 수정';
    document.getElementById('modalLat').value = p.lat;
    document.getElementById('modalLng').value = p.lng;
    document.getElementById('modalName').value = p.name;
    document.getElementById('modalName').removeAttribute('readonly');
    document.getElementById('modalCategory').value = p.category;
    document.getElementById('modalSchedule').value = p.schedule;
    document.getElementById('modalPicker').value = p.picker;
    document.getElementById('modalRating').value = p.rating;
    document.getElementById('modalReservation').value = p.reservation;
    document.getElementById('modalHours').value = p.hours;
    document.getElementById('modalNoKids').checked = p.noKids;
    document.getElementById('modalMemo').value = p.memo;

    // 임시로 수정할 아이디 저장
    document.getElementById('placeForm').dataset.editId = id;
    modal.style.display = 'block';
};

// 저장 및 새로고침 공통 함수
function saveAndReload() {
    localStorage.setItem('jeju_places', JSON.stringify(places));
    renderPlaces();
}

// 모달 닫기
const modal = document.getElementById('placeModal');
document.getElementsByClassName('modal-close')[0].onclick = () => modal.style.display = 'none';

// 폼 제출 (저장/수정 처리)
document.getElementById('placeForm').onsubmit = (e) => {
    e.preventDefault();
    const editId = document.getElementById('placeForm').dataset.editId;

    const placeData = {
        id: editId ? Number(editId) : Date.now(),
        name: document.getElementById('modalName').value,
        category: document.getElementById('modalCategory').value,
        schedule: document.getElementById('modalSchedule').value,
        picker: document.getElementById('modalPicker').value,
        rating: Number(document.getElementById('modalRating').value),
        reservation: document.getElementById('modalReservation').value,
        hours: document.getElementById('modalHours').value,
        noKids: document.getElementById('modalNoKids').checked,
        memo: document.getElementById('modalMemo').value,
        lat: Number(document.getElementById('modalLat').value),
        lng: Number(document.getElementById('modalLng').value),
        votes: editId ? places.find(p => p.id == editId).votes : 0
    };

    if (editId) {
        const index = places.findIndex(p => p.id == editId);
        places[index] = placeData;
        delete document.getElementById('placeForm').dataset.editId;
    } else {
        places.push(placeData);
    }

    saveAndReload();
    modal.style.display = 'none';
};

// 필터 변경 시 화면 갱신
document.getElementById('dayFilter').onchange = renderPlaces;
document.getElementById('categoryFilter').onchange = renderPlaces;

// 지도 초기 실행
window.onload = initMap;