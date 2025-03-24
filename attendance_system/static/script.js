document.addEventListener('DOMContentLoaded', function () {
    const clockInButton = document.getElementById('clock-in');
    const clockOutButton = document.getElementById('clock-out');
    const checkRecordsButton = document.getElementById('check-records');
    const redeemGiftButton = document.getElementById('redeem-gift');
    const giftOptions = document.getElementById('gift-options');
    const recordsDiv = document.getElementById('records');
    const scaryPopup = document.getElementById('popscare');
    const ghostpitc = document.getElementById('ghostid');
    
    // 顯示恐怖提示窗
    setTimeout(function () {
  
        scaryPopup.classList.add('show'); // 顯示提示視窗
        document.body.classList.add("shocked");
    }, 700);

    // 點擊恐怖提示窗時關閉提示窗並顯示鬼魂
    scaryPopup.addEventListener('click', function () {
        this.classList.remove('show'); // 隱藏提示視窗
        ghostpitc.classList.add("show"); // 顯示鬼魂
       // ghost.classList.add("animate");  
    });

    // 點擊鬼魂時隱藏鬼魂
    ghostpitc.addEventListener('click', function () {
        ghostpitc.classList.remove('show'); // 隱藏鬼魂
        
    });

    // 音樂播放
    document.addEventListener("click", function () {
        let audio = document.getElementById("bg-music");
        if (audio.paused) {
            audio.play().catch(error => console.log("自動播放被阻擋:", error));
        }
    });

    // 打卡功能
    clockInButton.addEventListener('click', async function () {
        const username = prompt("請輸入你的使用者名稱");
        if (!username) return;

        const data = await sendRequest(`/check-in/${username}`, 'POST');
        if (data) showAlert(data.message, 'success', 'top');
    });

    clockOutButton.addEventListener('click', async function () {
        const username = prompt("請輸入你的使用者名稱");
        if (!username) return;

        const data = await sendRequest(`/clock-out/${username}`, 'POST');
        if (data) showAlert(data.message, 'success', 'top');
    });

    checkRecordsButton.addEventListener('click', async function () {
        const username = prompt("請輸入你的使用者名稱");
        if (!username) return;

        await displayRecords(username);
        recordsDiv.style.display = "block"; // 顯示打卡紀錄區塊
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
            showAlert("積分不足，無法兌換禮物", 'error');
            return;
        }

        const redeemData = await sendRequest(`/redeem/${username}/1`, 'POST');
        if (redeemData) {
            showAlert(redeemData.message, 'success', 'top');
            await displayRecords(username);
        }
    });


    // 這裡是補充的缺少的定義

    // 假設 `sendRequest` 是一個發送 API 請求的函數
    async function sendRequest(url, method = 'GET', body = null) {
        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
        };

        if (body) {
            options.body = JSON.stringify(body);
        }

        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error('網路錯誤');
            return await response.json();
        } catch (error) {
            console.error('請求失敗:', error);
            return null;
        }
    }

    // 顯示提示訊息的函數
    function showAlert(message, type = 'info', position = 'top') {
        const alert = document.createElement('div');
        alert.classList.add('alert', type, position);
        alert.textContent = message;
        document.body.appendChild(alert);

        setTimeout(() => {
            alert.remove();
        }, 3000);
    }
});