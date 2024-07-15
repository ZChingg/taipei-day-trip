// 時間與費用轉換
function changeToMorning(){
  let morningDiv = document.querySelector("#morning");
  let afternoonDiv = document.querySelector("#afternoon");
  morningDiv.style.display = "block";
  afternoonDiv.style.display = "none";
}
function changeToAfternoon(){
  let morningDiv = document.querySelector("#morning");
  let afternoonDiv = document.querySelector("#afternoon");
  morningDiv.style.display = "none";
  afternoonDiv.style.display = "block";
}

// 僅能選取今日以後時間
document.addEventListener("DOMContentLoaded", ()=>{
  let dateInput = document.getElementById("date");
  let today = new Date();
  let yyyy = today.getFullYear();
  let mm = String(today.getMonth() + 1).padStart(2, "0");
  let dd = String(today.getDate()).padStart(2, "0");
  let todayDate = yyyy + "-" + mm + "-" + dd;
  dateInput.setAttribute("min", todayDate); 
});

// 獲取 attractionId 數字抓取對應景點資訊
let path = window.location.pathname; // 獲取path: /attraction/10
let attractionId = path.split("/").pop(); // pop(): 移除陣列最後一個值(縮短陣列長度)，並將 "值回傳"
// 抓資料
fetch(`/api/attraction/${attractionId}`)
.then(function(response){
  return response.json();
}).then(function(data){
  if(data.data){
    let site = data.data;
    let nameDiv = document.querySelector("#name");
    let categoryDiv = document.querySelector("#category");
    let addressDiv = document.querySelector("#address");
    let descriptionDiv = document.querySelector("#description"); 
    let transportDiv = document.querySelector("#transport");
    nameDiv.textContent = site["name"];
    categoryDiv.textContent = `${site["category"]} at ${site["mrt"]}`;
    addressDiv.textContent = site["address"];
    descriptionDiv.textContent = site["description"];
    transportDiv.textContent = site["transport"];

    // Skeleton Loading Screen
    document.getElementById("skeleton-screen").style.display = "none";
    document.getElementById("infos").style.display = "block";

    // 預載入 Attraction 圖片並於載入前顯示 loading 動畫
    let imagesLoaded = 0;
    document.querySelector(".slider__loading-pic").style.backgroundImage = `url(${site["images"][0]})`;

    for(let i=0; i<site.images.length; i++){
      const img = new Image();
      img.src = site.images[i];
      img.onload = function(){
        imagesLoaded++;
        // 圖片皆預載完成則建立幻燈片
        if(imagesLoaded === site.images.length){
          document.querySelector(".slider__loading").style.display = "none";
          document.querySelector(".slider__prev").style.display = "block";
          document.querySelector(".slider__next").style.display = "block";
          initializeSlider();
        }
      };
    }
    // 建立幻燈片
    function initializeSlider(){
      // 建 silde div
      let slider = document.querySelector(".slider div");
      let dotsbox = document.querySelector(".slider__dotsbox");
      for(let i=0; i<site.images.length; i++){
        // 照片部分
        let myslide = document.createElement("div");
        if(i===0){
          myslide.style = "display: block;";
        }
        myslide.className = "slider__myslide fade";
        myslide.style.backgroundImage = `url(${site.images[i]})`;
        slider.appendChild(myslide);
        // 下方圓點部分
        let dot = document.createElement("span");
        dot.className = "slider__dot";
        dot.onclick = currentSlide.bind(null, i+1); 
        dotsbox.appendChild(dot);
      }

      // slideshow 幻燈片功能
      const myslide = document.querySelectorAll(".slider__myslide");  // Nodelist
      const dot = document.querySelectorAll(".slider__dot");
      // 初始化計數+顯示首圖
      let counter = 1; 
      slidefun(counter);
      // 切換圖片
      // 1.自動播放: setInterval(func, delay)延遲某時間後執行對應程式且"不斷循環"
      let timer = setInterval(autoSlide, 5000);
      function autoSlide(){
        counter += 1;
        slidefun(counter);
      }
      // 2.點按箭頭
      function plusSlides(n){
        counter += n;
        slidefun(counter);
        resetTimer();
      }
      // 3.點按下方圓點
      function currentSlide(n){
        counter = n;
        slidefun(counter);
        resetTimer();
      }
      // 若點箭頭or下方圓點，重新啟動自動播放
      function resetTimer(){
        clearInterval(timer);
        timer = setInterval(autoSlide, 5000);
      }

      function slidefun(n){
        // 先把所有圖片都隱藏+圓點回歸一般樣式
        for(let i=0; i<myslide.length; i++){
          myslide[i].style.display = "none";
        }
        for(let i=0; i<dot.length; i++){
          dot[i].className = dot[i].className.replace(" active", "");
        }
        // 循環: 計數超出照片總數就回到第一張
        if(n > myslide.length){
          counter = 1;
        }
        // 循環: 計數0/負數就回到最後一張
        if(n < 1){
          counter = myslide.length;
        }
        myslide[counter-1].style.display = "block";
        dot[counter-1].classList.add("active");
      }

      // 改用 addEventListener 避免 html 直接用 onclick = plsuSlides()，但函式在頁面加載時還尚未被定義問題
      document.querySelector('.slider__prev').addEventListener("click", ()=>{
        plusSlides(-1);
      });
      document.querySelector('.slider__next').addEventListener("click", ()=>{
        plusSlides(1);
      });
    }
  }else{
    document.location.href="/" // 若數字沒資料就導回首頁
  }
});

// 點擊預定按鈕建立新行程
function getBooking(event){
  event.preventDefault();
  token = localStorage.getItem("token");
  if(token){
    let date = document.getElementById("date").value;
    let time = document.querySelector("input[name='time']:checked").value; // 雙/單引號內不能有雙/單引號
    let price = 2000;
    if(time == "afternoon"){
      price = 2500;
    }
    let data = {
      attractionId: attractionId,
      date: date,
      time: time,
      price: price,
    }
    fetch("/api/booking", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(data)
    }).then(function(response){ 
      return response.json();
    }).then(function(data){
      // 若成功則導連至 booking 頁面
      if(data.ok){
        document.location.href="/booking"
      // 若失敗則跳出登入 popup 
      }else{
        getSign();
      }
    })
  }else{
    getSign();
  }
}
