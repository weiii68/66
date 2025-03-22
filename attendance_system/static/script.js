document.addEventListener('DOMContentLoaded', function () {
    const clockInButton = document.getElementById('clock-in');
    const clockOutButton = document.getElementById('clock-out');
    const checkRecordsButton = document.getElementById('check-records');
    const redeemGiftButton = document.getElementById('redeem-gift');
    const giftOptions = document.getElementById('gift-options');
    const recordsDiv = document.getElementById('records');
    const loadingIndicator = document.getElementById('loading');

    function showAlert(message, type = 'error') {
        const alertDiv = document.getElementById('alert');
        if (alertDiv) {
            alertDiv.textContent = message;
            alertDiv.style.display = 'block';
            alertDiv.className = 'alert ' + (type === 'success' ? 'success' : 'error');
            alertDiv.classList.add('show');

            setTimeout(() => {
                alertDiv.classList.remove('show');
                setTimeout(() => alertDiv.style.display = 'none', 300);
            }, 3000);
        } else {
            console.error("Alert div not found!");
        }
    }

    async function sendRequest(url, method = 'GET') {
        try {
            loadingIndicator.style.display = 'block';
            const response = await fetch(url, { method });
            const data = await response.json();

            if (!response.ok) throw new Error(data.message || "請求失敗");

            return data;
        } catch (error) {
            showAlert(error.message, 'error');
            return null;
        } finally {
            loadingIndicator.style.display = 'none';
        }
    }

    clockInButton.addEventListener('click', async function () {
        const username = prompt("請輸入你的使用者名稱");
        if (!username) return;

        const data = await sendRequest(`/check-in/${username}`, 'POST');
        if (data) showAlert(data.message, 'success');
    });

    clockOutButton.addEventListener('click', async function () {
        const username = prompt("請輸入你的使用者名稱");
        if (!username) return;

        const data = await sendRequest(`/clock-out/${username}`, 'POST');
        if (data) showAlert(data.message, 'success');
    });

    checkRecordsButton.addEventListener('click', async function () {
        const username = prompt("請輸入你的使用者名稱");
        if (!username) return;

        await displayRecords(username);
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
            // 顯示積分
            recordsDiv.innerHTML += `<p><strong>目前積分:</strong> ${pointsData.points}</p>`;
            
            // 假設 pointsData 中有總工時（以分鐘為單位）
            const totalWorkedMinutes = pointsData.total_worked_minutes || 0;
            // 計算距離下一個積分還差多少分鐘
            const minutesToNextPoint = 240 - (totalWorkedMinutes % 240);
            recordsDiv.innerHTML += `<p><strong>距離下一個積分還差:</strong> ${minutesToNextPoint} 分鐘</p>`;
        }
    }
});
