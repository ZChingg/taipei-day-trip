// 確認當前登入的會員資訊
let token = localStorage.getItem("token"); // getItem() 傳遞 key 名返回 value
if(token){
  fetch("/api/user/auth", {
    method: "GET",
    headers: {"Authorization": `Bearer ${token}`}
  }).then(function(response){
    return response.json();
  }).then(function(data){ 
    if(data != null && data.data){ 
      // 若有抓到資料(已登入)，顯示"登出系統"文字
      let signoutText = document.getElementById("signout");
      let signinText = document.getElementById("signin");
      signoutText.style.display = "block";
      signinText.style.display = "none";
      // 點擊 "預定行程"，導連至 bookong 頁面
      document.getElementById("bookingPage").addEventListener("click", ()=>{
        document.location.href="/booking" 
      });
      // booking 頁面預填聯絡資訊用
      let welcomeMemberName = document.getElementById("welcomeMemberName");
      let bookingName = document.getElementById("bookingName");
      let bookingEmail = document.getElementById("bookingEmail");
      if(welcomeMemberName && bookingName && bookingEmail){
        let memberName = data.data.name;
        let memberEmail = data.data.email;
        welcomeMemberName.textContent = memberName;
        bookingName.value = memberName;
        bookingEmail.value = memberEmail;
      }
    }else{ 
      // 登入失敗or未登入，點擊 "預定行程" 跳出登入 popup
      if(document.location.pathname == "/thankyou"){
        document.location.href = "/"
      }
      signinError();
      document.getElementById("bookingPage").addEventListener("click", ()=>{
        getSign();
      });
    }
  })
}else{
  if(document.location.pathname == "/thankyou"){
    document.location.href = "/"
  }
  signinError();
  document.getElementById("bookingPage").addEventListener("click", ()=>{
    getSign();
  });
}
// 登入失敗or未登入，顯示"登入/註冊"文字
function signinError(){
  let signoutText = document.getElementById("signout");
  let signinText = document.getElementById("signin");
  signoutText.style.display = "none";
  signinText.style.display = "block";
}

// popup 設置
function getSign(){
  let wrapperPopup = document.querySelector(".popup__wrapper");
  wrapperPopup.style.display = "block";
}
function getClose(){ 
  let wrapperPopup = document.querySelector(".popup__wrapper");
  let popupInputs = document.querySelectorAll(".popup__input");
  let popupAlerts = document.querySelectorAll(".popup__alert");
  wrapperPopup.style.display = "none";
  for(let i=0; i<popupInputs.length; i++){
    popupInputs[i].value = ""; // 若關閉 popup，就清空原輸入內容/提示語
  }
  for(let i=0; i<popupAlerts.length; i++){
    popupAlerts[i].style.display = "none"; 
  }
}
function ChangeToSignIn(){
  let popupSignin = document.querySelector("#popup-signin");
  let popupSignup = document.querySelector("#popup-signup");
  let signupAlert = document.querySelector("#signup-alert");
  let popupInputs = document.querySelectorAll("#popup-signup .popup-input");
  popupSignin.style.display = "block";
  popupSignup.style.display = "none";
  signupAlert.style.display = "none";
  for(let i=0; i<popupInputs.length; i++){
    popupInputs[i].value = ""; 
  }
}
function ChangeToSignUp(){
  let popupSignin = document.querySelector("#popup-signin");
  let popupSignup = document.querySelector("#popup-signup");
  let signinAlert = document.querySelector("#signin-alert");
  let popupInputs = document.querySelectorAll("#popup-signin .popup-input"); // 取 popup-signin 裡 所有 popup-input
  popupSignin.style.display = "none";
  popupSignup.style.display = "block";
  signinAlert.style.display = "none";
  for(let i=0; i<popupInputs.length; i++){
    popupInputs[i].value = ""; 
  }
}

// 登入會員
function getSignIn(){
  let email = document.getElementById("signin-email").value;
  let password = document.getElementById("signin-password").value;
  let alert = document.getElementById("signin-alert");
  if(email !== "" && password !== ""){
    let emailRule = /^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/; // 正規表達式
    if(!emailRule.test(email)){ // regexObj.test(str): 正規表達式與指定字串是否匹配
      alert.style.display = "flex";
      alert.style.color = "darkred";
      alert.textContent = "請輸入有效的電子郵件";
      return; // 停止函數執行
    }
    let data = { 
      email: email, // 名稱需與後端 pydantic model 一致
      password: password
    }
    fetch("/api/user/auth", {
      method: "PUT",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(data) // 將物件轉換為 JSON 字串發送
    }).then(function(response){ // then 處理響應
      return response.json();
    }).then(function(data){ // 將物件放入 data 參數
      if(data.token){ // 若 data 參數中有 token 資料
        localStorage.setItem("token", data.token); // setItem("key", "value"): 加入/修改屬性
        location.reload(); // refresh
      }else{
        alert.style.display = "flex";
        alert.style.color = "darkred"
        alert.textContent = "電子郵件或密碼錯誤"
      }
    })
  }else{
    alert.style.display = "flex";
    alert.style.color = "darkred"
    alert.textContent = "請輸入電子郵件與密碼"
  }
}
// 註冊會員
function getSignUp(){
  let name = document.getElementById("signup-name").value;
  let email = document.getElementById("signup-email").value;
  let password = document.getElementById("signup-password").value;
  let alert = document.getElementById("signup-alert");
  if(name !=="" && email !== "" && password !== ""){
    let emailRule = /^\w+([-+.]\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*$/;
    if(!emailRule.test(email)){ 
      alert.style.display = "flex";
      alert.style.color = "darkred";
      alert.textContent = "請輸入有效的電子郵件";
      return;
    }
    let data = { 
      name: name,
      email: email,
      password: password
    };
    fetch("/api/user", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(data) 
    }).then(function(response){ 
      return response.json();
    }).then(function(data){
      if(data.ok){
        alert.style.display = "flex";
        alert.style.color = "green";
        alert.textContent = "註冊成功，請登入系統";
      }else{
        alert.style.display = "flex";
        alert.style.color = "darkred";
        alert.textContent = "Email 已經註冊帳戶";
      }
    })
  }else{
    alert.style.display = "flex";
    alert.style.color = "darkred";
    alert.textContent = "請輸入姓名、電子郵件與密碼";
  }
}

// 登出會員
function getSignOut(){
  localStorage.removeItem("token"); // 移除 token
  location.reload(); // refresh
}