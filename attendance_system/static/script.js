// 定義 sendRequest 函數
async function sendRequest(url, method = 'GET', data = null) {
    try {
        const options = {
            method: method, 
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || '請求失敗');
        }

        return result;
    } catch (error) {
        console.error('請求失敗:', error);
        showAlert(error.message, 'error');
        return null;
    }
}

// 定義 showAlert 函數來顯示提示
function showAlert(message, type, position = 'bottom') {
    const alertBox = document.createElement('div');
    alertBox.classList.add('alert', type); // 根據 type 改變樣式
    alertBox.innerText = message;
    document.body.appendChild(alertBox);

    // 控制提示框顯示的位置
    alertBox.style.animation = 'fadeIn 0.5s ease-out';  // 加入動畫效果

    if (position === 'top') {
        alertBox.style.position = 'fixed';
        alertBox.style.top = '20px';
        alertBox.style.left = '50%';
        alertBox.style.transform = 'translateX(-50%)';
    } else if (position === 'bottom') {
        alertBox.style.position = 'fixed';
        alertBox.style.bottom = '20px';
        alertBox.style.left = '50%';
        alertBox.style.transform = 'translateX(-50%)';
    }

    // 設置 3 秒後自動消失
    setTimeout(() => {
        alertBox.style.animation = 'fadeOut 0.5s ease-in';
        setTimeout(() => alertBox.remove(), 500); // 延遲移除元素
    }, 3000);
}

document.addEventListener('DOMContentLoaded', function () {
    const clockInButton = document.getElementById('clock-in');
    const clockOutButton = document.getElementById('clock-out');
    const checkRecordsButton = document.getElementById('check-records');
    const redeemGiftButton = document.getElementById('redeem-gift');
    const giftOptions = document.getElementById('gift-options');
    const recordsDiv = document.getElementById('records');
    const loadingIndicator = document.getElementById('loading');
    const scaryPopup = document.getElementById('scaryPopup');
    const ghost = document.getElementById('ghost'); // 獲取鬼魂元素

    // 0.5秒後觸發顯示恐怖提示窗
    setTimeout(function() {
        scaryPopup.classList.add('show');
        document.body.classList.add("shocked");
    }, 500);

    // 當點擊恐怖提示窗時，關閉提示窗並顯示鬼魂
    scaryPopup.addEventListener('click', function() {
        this.style.display = 'none';
        ghost.style.display = "block";
        ghost.classList.add("animate");

        let scaryText = document.createElement("div");
        scaryText.classList.add("scary-text");
        scaryText.innerText = "你被監控了！";
        document.body.appendChild(scaryText);
    });

    ghost.addEventListener('click', function() {
        this.style.display = 'none';
    });

    clockInButton.addEventListener('click', async function () {
        const username = prompt("請輸入你的使用者名稱");
        if (!username) return;

        const data = await sendRequest(`/check-in/${username}`, 'POST');
        if (data) showAlert(data.message, 'success', 'top');  // 顯示在頁面頂部
    });

    clockOutButton.addEventListener('click', async function () {
        const username = prompt("請輸入你的使用者名稱");
        if (!username) return;

        const data = await sendRequest(`/clock-out/${username}`, 'POST');
        if (data) showAlert(data.message, 'success', 'top');  // 顯示在頁面頂部
    });

    checkRecordsButton.addEventListener('click', async function () {
        const username = prompt("請輸入你的使用者名稱");
        if (!username) return;

        await displayRecords(username);
        
        // 顯示打卡紀錄區塊
        const records = document.getElementById("records");
        records.style.display = "block";  // 顯示打卡紀錄區塊
    });

    async function displayRecords(username) {
        const data = await sendRequest(`/records/${username}`);
        if (!data) return;
        
        recordsDiv.innerHTML = "<h2>打卡紀錄</h2>";
        recordsDiv.style.display = 'block';
        
        if (data.records.length > 0) {
            data.records.forEach(record => {
                recordsDiv.innerHTML += `  
                    <p><strong>日期:</strong> ${record.date}</p>
                    <p>上班時間: ${record.start}</p>
                    <p>下班時間: ${record.end}</p>
                    <p>總工時: ${record.total_hours}</p>
                    <hr>`; 
            });
        } else {
            recordsDiv.innerHTML += "<p>沒有打卡紀錄</p>";
        }
        
        const pointsData = await sendRequest(`/points/${username}`);
        if (pointsData) {
            recordsDiv.innerHTML += `<p><strong>目前積分:</strong> ${pointsData.points}</p>`;
            const totalWorkedMinutes = pointsData.total_worked_minutes || 0;
            const minutesToNextPoint = 240 - (totalWorkedMinutes % 240);
            recordsDiv.innerHTML += `<p><strong>距離下一個積分還差:</strong> ${minutesToNextPoint} 分鐘</p>`;
        }
    }

    redeemGiftButton.addEventListener('click', async function () {
        const username = prompt("請輸入你的使用者名稱");
        if (!username) return;

        const selectedGift = giftOptions.value;
        if (selectedGift !== "1") {
            showAlert("請選擇一個禮物", 'error');
            return;
        }

        const pointsData = await sendRequest(`/points/${username}`);
        if (!pointsData || pointsData.points < 1) {
            showAlert("積分不足，無法兌換菸", 'error');
            return;
        }

        const redeemData = await sendRequest(`/redeem/${username}/1`, 'POST');
        if (redeemData) {
            showAlert(redeemData.message, 'success', 'top');
            await displayRecords(username);
        }
    });

    document.addEventListener("mousemove", function(event) {
        let pupils = document.querySelectorAll(".pupil");
        pupils.forEach(pupil => {
            let rect = pupil.parentElement.getBoundingClientRect();
            let eyeX = rect.left + rect.width / 2;
            let eyeY = rect.top + rect.height / 2;
            let deltaX = event.clientX - eyeX;
            let deltaY = event.clientY - eyeY;
            let angle = Math.atan2(deltaY, deltaX);
            let moveX = Math.cos(angle) * 8;
            let moveY = Math.sin(angle) * 8;
            pupil.style.transform = `translate(${moveX}px, ${moveY}px)`; 
        });
    });
});
