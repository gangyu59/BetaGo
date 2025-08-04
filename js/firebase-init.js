// firebase-init.js    Firebase单例控制器
(() => {
    // 清理旧实例
    if (typeof firebase !== 'undefined' && firebase.apps.length > 0) {
        firebase.apps.forEach(app => app.delete());
    }

    // 项目配置
    const config = {
        apiKey: "AIzaSyCW2qJyqA82vnyLz58INpCn0qVnN_IRtmo",
        authDomain: "gameagent-c75fe.firebaseapp.com",
        databaseURL: "https://gameagent-c75fe-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "gameagent-c75fe",
        storageBucket: "gameagent-c75fe.firebasestorage.app",
        messagingSenderId: "516319255553",
        appId: "1:516319255553:web:a209a091d4b5416e767400"
    };

    try {
        // 初始化核心
        const app = firebase.initializeApp(config);
        window.db = app.database();
        
        // 调试输出
        const debug = (msg, isError = false) => {
            const el = document.getElementById('debug-log');
            if (el) el.innerHTML += `<p style="color:${isError?'red':'green'}">${msg}</p>`;
            console.log(`%c${msg}`, `color:${isError?'red':'green'}`);
        };

        // 连接测试（简化版）
        db.ref('.info/connected').on('value', snap => {
            const connected = snap.val();
            debug(connected ? "🟢 实时连接正常" : "🔴 连接断开");

            // ✅ 若连接正常，隐藏等待区
            if (connected) {
                const waitingView = document.getElementById('waitingView');
                if (waitingView) {
                    waitingView.style.display = 'none';
                }
            }
        });

        debug("✅ Firebase初始化完成");
        
    } catch (err) {
        console.error("Firebase启动失败:", err);
    }
})();