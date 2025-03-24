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

    // 點擊恐怖提示窗時關閉提示視窗並顯示鬼魂
    scaryPopup.addEventListener('click', function () {
        this.classList.remove('show'); // 隱藏提示視窗
        ghostpitc.classList.add("show"); // 顯示鬼魂
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

    // 點擊「開始上班」按鈕顯示血手印
    clockInButton.addEventListener('click', async function (event) {
        const username = prompt("請輸入你的使用者名稱");
        if (!username) return;

        const data = await sendRequest(`/check-in/${username}`, 'POST');
        if (data) {
            showAlert(data.message, 'success', 'top');  // 顯示打卡成功訊息

            // 延遲顯示血手印
            setTimeout(function () {
                showBloodHandPrint(event); // 顯示血手印
            }, 500); // 延遲500毫秒，確保成功訊息先顯示
        }
    });

    // 點擊「兌換禮物」按鈕顯示血手印
    redeemGiftButton.addEventListener('click', function(event) {
        showBloodHandPrint(event);
    });

    function showBloodHandPrint(event) {
        console.log('血手印顯示位置:', event.pageX, event.pageY); // 打印出點擊位置，檢查是否正確
    
        const handPrint = document.createElement('div');
        handPrint.classList.add('blood-hand');
    
        // 設定手印的顯示位置及大小，讓其覆蓋整個頁面
        handPrint.style.position = 'fixed';
        handPrint.style.left = '0';
        handPrint.style.top = '0';
        handPrint.style.width = '100vw';  // 覆蓋整個視窗寬度
        handPrint.style.height = '100vh'; // 覆蓋整個視窗高度
    
        document.body.appendChild(handPrint);
    
        // 3秒後移除手印
        setTimeout(() => handPrint.remove(), 3000);  // 增加顯示時間
    }

    // 每隔0.5秒生成血滴效果
    setInterval(generateBloodStream, 500);

    // 生成血滴流動效果
    function generateBloodStream() {
        const bloodStream = document.createElement('div');
        bloodStream.classList.add('blood-stream');
        
        // 隨機生成血液起始位置
        const randomLeft = Math.random() * window.innerWidth;  // 隨機水平位置

        bloodStream.style.left = `${randomLeft}px`;
        bloodStream.style.top = `-20px`;  // 初始位置在頁面頂端上方
        
        // 設定血液流動的高度和寬度
        const streamHeight = Math.random() * (100 - 50) + 50;  // 隨機生成流動的高度
        bloodStream.style.height = `${streamHeight}px`;
        
        // 設定血液顏色
        const bloodColor = `rgba(200, 0, 0, ${Math.random() * 0.5 + 0.5})`;  // 更真實的紅色
        bloodStream.style.backgroundColor = bloodColor;
        
        // 設定血液流動的動畫效果
        bloodStream.style.animation = `flow ${Math.random() * 2 + 2}s ease-in-out forwards`;  // 隨機的流動速度
        
        // 將血液流動元素加到頁面中
        document.body.appendChild(bloodStream);
        
        // 每2秒後移除血液流動
        setTimeout(() => {
            bloodStream.remove();
        }, 2000);  // 動畫結束後移除
    }

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
