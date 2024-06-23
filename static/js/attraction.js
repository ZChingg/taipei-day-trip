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

// 獲取 attractionId 數字抓取對應資訊
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
    // 建 silde div
    let slider = document.querySelector(".slider div");
    let dotsbox = document.querySelector(".dotsbox");
    for(let i=0; i<site.images.length; i++){
      // 照片部分
      let images = site.images[i]
      let myslide = document.createElement("div");
      if(i===0){
        myslide.style = "display: block;";
      }
      myslide.className = "myslide fade";
      myslide.style.backgroundImage = `url(${images})`;
      slider.appendChild(myslide);
      // 下方圓點部分
      let dot = document.createElement("span");
      dot.className = "dot";
      dot.onclick = currentSlide.bind(null, i+1); 
      dotsbox.appendChild(dot);
    }

    // slideshow 幻燈片功能
    const myslide = document.querySelectorAll(".myslide");  // Nodelist
    const dot = document.querySelectorAll(".dot");
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

    function slidefun(counter){
      // 先把所有圖片都隱藏+圓點回歸一般樣式
      for(let i=0; i<myslide.length; i++){
        myslide[i].style.display = "none";
      }
      for(let i=0; i<dot.length; i++){
        dot[i].className = dot[i].className.replace(" active", "");
      }
      // 循環: 計數超出照片總數就回到第一張
      if(counter > myslide.length){
        counter = 1;
      }
      // 循環: 計數0/負數就回到最後一張
      if(counter < 1){
        counter = myslide.length;
      }
      myslide[counter-1].style.display = "block";
      dot[counter-1].classList.add("active");
    }

    // 避免 html 直接用 onclick = plsuSlides()，但函式在頁面加載時還尚未被定義問題
    document.querySelector('.prev').addEventListener("click", ()=>{
      plusSlides(-1);
    });
    document.querySelector('.next').addEventListener("click", ()=>{
      plusSlides(1);
    });
  }else{
    document.location.href="/" // 若數字沒資料就導回首頁
  }
});