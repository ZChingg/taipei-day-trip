// 確認當前登入會員的預定資料
token = localStorage.getItem("token"); // getItem() 傳遞 key 名返回 value
if(token){
  fetch("/api/booking", {
    method: "GET",
    headers: {"Authorization": `Bearer ${token}`}
  }).then(function(response){
    return response.json();
  }).then(function(data){ 
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
    // 如果回傳資料為 null，則顯示 "目前沒有待預定行程"
    }else if(data == null){
      bookingData.style.display = "none";
      noBookingData.style.display = "block";
      let footerElement = document.querySelector("footer");
      footerElement.style.height = "100vh";
    // 若未登入則導至首頁
    }else{
      document.location.href = "/";
    }
  })
}else{
  document.location.href = "/";
}

// 刪除預定行程功能
function getDelete(){
  token = localStorage.getItem("token");
  fetch("/api/booking", {
    method: "DELETE",
    headers: {"Authorization": `Bearer ${token}`}
  }).then(function(response){
    return response.json();
  }).then(function(data){ 
    if(data.ok){
      location.reload();
    }
  })
}

