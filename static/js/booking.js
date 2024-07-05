// 確認當前登入會員的預定資料
async function getOrderData(){
  if(!token){
    document.location.href = "/";
    return;
  }
  const response = await fetch("/api/booking", {
    method: "GET",
    headers: {"Authorization": `Bearer ${token}`}
  });
  const data = await response.json();
  let bookingData = document.getElementById("bookingData");
  let noBookingData = document.getElementById("noBookingData");
  if(data != null && data.data){ // 確認 data 不為 null/undefined，若為 == 則嚴格比對不為 null 
    bookingData.style.display = "block";
    noBookingData.style.display = "none";
    let site = data.data
    let tourPicture = document.querySelector(".section__picture")
    let tourLink = document.getElementById("tourLink");
    let tourName = document.getElementById("tourName");
    let tourDate = document.getElementById("tourDate");
    let tourTime = document.getElementById("tourTime");
    let tourPrice = document.getElementById("tourPrice");
    let tourAddress = document.getElementById("tourAddress");
    let tourPayment = document.getElementById("tourPayment");
    tourPicture.style.backgroundImage = `url(${site["attraction"]["image"]})`;
    tourLink.href = `/attraction/${site["attraction"]["id"]}`;
    tourName.textContent = site["attraction"]["name"];
    tourDate.textContent = site["date"];
    tourPrice.textContent = `新台幣 ${site["price"]} 元`;
    tourPayment.textContent = `新台幣 ${site["price"]} 元`;
    tourAddress.textContent = site["attraction"]["address"]
    if(site["time"] == "morning"){
      tourTime.textContent = "早上 9 點到下午 4 點";
    }else{
      tourTime.textContent = "下午 2 點到晚上 9 點";
    }
    return site;
  // 若回傳資料為 null，則顯示 "目前沒有待預定行程"
  }else if(data == null){
    bookingData.style.display = "none";
    noBookingData.style.display = "block";
    let footerElement = document.querySelector("footer");
    footerElement.style.height = "100vh";
  // 若未登入則導至首頁
  }else{
    document.location.href = "/";
  }
}

// 刪除預定行程功能
// 根據不同情境，用 shouldReload 布林值判斷是否要 reload
async function getDelete(shouldReload = false){
  const response = await fetch("/api/booking", {
    method: "DELETE",
    headers: {"Authorization": `Bearer ${token}`}
  });
  const data = await response.json();
  if(data.ok && shouldReload){
    location.reload();
  }
}


// TapPay
// TPDirect.setupSDK(appID, appKey, serverType): 設定參數
TPDirect.setupSDK(151816, 'app_Mtx6WkGcpIuChZC2TDsxoggwioimE5WxLdp2Anvca4gG5dt6HUVXZhoUGUiu', 'sandbox');


// TPDirect.card.setup(config): 設定外觀
TPDirect.card.setup({
  fields: {
    number: {
      element: '#card-number',
      placeholder: '**** **** **** ****'
    },
    expirationDate: {
      element: document.getElementById('card-expiration-date'),
      placeholder: 'MM / YY'
    },
    ccv: {
      element: '#card-ccv',
      placeholder: 'CVV'
    }
  },
  styles: {
    'input': {
        'color': 'gray',
        'font-size': '16px',
        'line-height': '14px',
        'font-weight': '500'
    },
    '.valid': {
        'color': 'green'
    },
    '.invalid': {
        'color': 'red'
    },
    '@media screen and (max-width: 400px)': {
        'input': {
            'color': 'orange'
        }
    }
  },
  // 遮蔽卡號: 輸入正確後，僅顯示前六後四碼卡號
  isMaskCreditCardNumber: true,
  maskCreditCardNumberRange: {
      beginIndex: 6,
      endIndex: 11
  }
})

// TPDirect.card.onUpdated(callback): 得知卡片資訊輸入狀態
TPDirect.card.onUpdate(function(update){
  const submitButton = document.querySelector('button[type="submit"]');
  // 若 canGetPrime === true 表全欄位正確，可呼叫 getPrime
  if(update.canGetPrime){
    submitButton.removeAttribute('disabled'); // 移除屬性 disabled，表單不提交
  }else{ // hasError
    submitButton.setAttribute('disabled', true); 
  }
})


// TPDirect.card.getPrime(callback): 提交表單時利用此取得 prime 字串
document.querySelector('form').addEventListener('submit', onSubmit);
async function onSubmit(event){
  event.preventDefault();
  // 取得欄位狀態
  const tappayStatus = TPDirect.card.getTappayFieldsStatus();
  // 確認是否可 getPrime，錯誤則 return
  if(tappayStatus.canGetPrime === false){
    return;
  }

  let orderData = await getOrderData(); // 取得 site 資訊 for order
  
  // Get prime
  TPDirect.card.getPrime(async function(result){ // result 參數含調用 getPrime 後結果
    if(result.status !== 0){ // 若錯誤
      return;
    }
    // 若正確
    let name = document.getElementById("bookingName").value;
    let email = document.getElementById("bookingEmail").value;
    let phone = document.getElementById("bookingTel").value;
    let data = {
      prime: result.card.prime,
      order: {
        price: orderData.price,
        trip: {
          attraction: {
            id: orderData.attraction.id,
            name: orderData.attraction.name,
            address: orderData.attraction.address,
            image: orderData.attraction.image,
          },
          date: orderData.date,
          time: orderData.time,
        },
        contact: {
          name: name,
          email: email,
          phone: phone
        }
      }
    }
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    });
    const responseData = await response.json();
    let errorMsgDiv = document.querySelector(".confirm__error-message");
    if(responseData.data){
      if(responseData.data.payment.status == 0){
        let orderNumber = responseData.data.number;
        getDelete(false); // 刪除 booking 預定資料
        document.location.href = `/thankyou?number=${orderNumber}`;
      }else{
        errorMsgDiv.textContent = responseData.data.payment.message;
      }
    }else{
      errorMsgDiv.textContent = responseData.message;
    }
  })
}

getOrderData();