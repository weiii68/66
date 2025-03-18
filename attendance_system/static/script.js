document.addEventListener('DOMContentLoaded', function () {
    const clockInButton = document.getElementById('clock-in');
    const clockOutButton = document.getElementById('clock-out');
    const checkRecordsButton = document.getElementById('check-records');
    const redeemGiftButton = document.getElementById('redeem-gift');
    const giftOptions = document.getElementById('gift-options');
    const recordsDiv = document.getElementById('records');
    const loadingIndicator = document.getElementById('loading');  // 用來顯示載入中的指示器

    function showAlert(message, type = 'error') {
        const alertDiv = document.getElementById('alert');
        if (alertDiv) {
            alertDiv.textContent = message;
            alertDiv.style.display = 'block';  // 顯示 alert 元素
            alertDiv.className = 'alert ' + (type === 'success' ? 'success' : 'error');
            
            // 添加 show 類別以觸發 opacity 過渡
            alertDiv.classList.add('show');
            
            // 3秒後隱藏 alert
            setTimeout(() => {
                alertDiv.classList.remove('show');
                setTimeout(() => alertDiv.style.display = 'none', 300);  // 顯示後再隱藏
            }, 6000);  // 設置 3秒後隱藏
        } else {
            console.error("Alert div not found!");
        }
    }
    

// 開始上班
clockInButton.addEventListener('click', async function () {
    const username = prompt("請輸入你的使用者名稱");

    if (username) {
        try {
            loadingIndicator.style.display = 'block';  // 顯示載入中訊息
            const response = await fetch(`/check-in/${username}`, { method: 'POST' });

            const data = await response.json(); // 只調用一次 response.json()

            // 檢查回應
            if (!response.ok) {
                throw new Error(data.message || '打卡失敗');
            }

            showAlert(data.message, 'success');  // 顯示打卡成功訊息
        } catch (error) {
            showAlert("打卡失敗: " + error.message, 'error');
        } finally {
            loadingIndicator.style.display = 'none';  // 隱藏載入中訊息
        }
    }
});

// 結束上班
clockOutButton.addEventListener('click', async function () {
    const username = prompt("請輸入你的使用者名稱");

    if (username) {
        try {
            loadingIndicator.style.display = 'block';  // 顯示載入中訊息
            const response = await fetch(`/clock-out/${username}`, { method: 'POST' });

            const data = await response.json(); // 只調用一次 response.json()

            // 檢查回應
            if (!response.ok) {
                throw new Error(data.message || '結束上班失敗');
            }

            showAlert(data.message, 'success');  // 顯示下班成功訊息
        } catch (error) {
            showAlert("結束上班失敗: " + error.message, 'error');
        } finally {
            loadingIndicator.style.display = 'none';  // 隱藏載入中訊息
        }
    }
});

    // 查詢打卡紀錄
    checkRecordsButton.addEventListener('click', async function () {
        const username = prompt("請輸入你的使用者名稱");

        if (username) {
            recordsDiv.innerHTML = "<h2>打卡紀錄</h2>";
            await displayRecords(username);
        }
    });

    // 顯示打卡紀錄
    async function displayRecords(username) {
        try {
            const response = await fetch(`/records/${username}`);
            const data = await response.json();
            recordsDiv.style.display = 'block';  // 顯示 alert 元素
            if (data.records && data.records.length > 0) {
                recordsDiv.innerHTML = '';  // 清除之前的紀錄
                
                data.records.forEach(record => {
                    recordsDiv.innerHTML += `
                        <p><strong>日期:</strong> ${record.date}</p>
                        <p>上班時間: ${record.start}</p>
                        <p>下班時間: ${record.end}</p>
                        <p>總工時: ${record.total_hours}</p>
                        <hr>`;
                });
            } else {
                recordsDiv.innerHTML = "<p>沒有打卡紀錄</p>";
            }

            // 顯示積分
            const pointsResponse = await fetch(`/points/${username}`);
            const pointsData = await pointsResponse.json();
            recordsDiv.innerHTML += `<p><strong>目前積分:</strong> ${pointsData.points}</p>`;
        } catch (error) {
            showAlert("獲取紀錄時發生錯誤: " + error.message, 'error');
        }
    }
    // 兌換禮物
    redeemGiftButton.addEventListener('click', async function () {
        const username = prompt("請輸入你的使用者名稱");
        const selectedGift = giftOptions.value;
        let pointsRequired = 0;

        if (selectedGift === "1") {
            pointsRequired = 1;
        } else {
            showAlert("請選擇一個禮物", 'error');
            return;
        }

        if (username) {
            try {
                loadingIndicator.style.display = 'block';
                const pointsResponse = await fetch(`/points/${username}`);
                const pointsData = await pointsResponse.json();

                if (pointsData.points < pointsRequired) {
                    showAlert("積分不足，無法兌換菸", 'error');
                    return;
                }

                const redeemResponse = await fetch(`/redeem/${username}/${pointsRequired}`, { method: 'POST' });

                if (!redeemResponse.ok) {
                    const data = await redeemResponse.json();
                    throw new Error(data.message || '兌換菸發生錯誤');
                }

                const redeemData = await redeemResponse.json();
                showAlert(redeemData.message, 'success');

                recordsDiv.innerHTML = "<h2>打卡紀錄</h2>";
                await displayRecords(username);

            } catch (error) {
                showAlert("兌換菸發生錯誤: " + error.message, 'error');
            } finally {
                loadingIndicator.style.display = 'none';
            }
        }
    });
     
});
