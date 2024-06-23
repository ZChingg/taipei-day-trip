// Listbar
// 設置左右滾動功能
let scrollContainer = document.querySelector(".container");
let arrowRight = document.querySelector(".arrow-right");
let arrowLeft = document.querySelector(".arrow-left");
arrowRight.addEventListener("click", ()=>{
  scrollContainer.style.scrollBehavior = "smooth";
  scrollContainer.scrollLeft += getDistance();
});
arrowLeft.addEventListener("click", ()=>{
  scrollContainer.style.scrollBehavior = "smooth";
  scrollContainer.scrollLeft -= getDistance();
});  
// 因應網頁寬度設置每次滾動距離
function getDistance(){
  let width = window.innerWidth;
  let containerDistance = document.querySelector(".container").offsetWidth; // 元素本身寬度(含border/捲軸/padding)
  if(width >= 600 && width <= 1199){
    return containerDistance*0.9;
  }else if(width <= 599){
    return containerDistance*0.8;
  }else{
    return 1050;
  }
}
// 載入 mrt 資料
fetch("/api/mrts")
.then(function(response){
  return response.json();
}).then(function(mrt){
  let containerDiv = document.querySelector(".container div");
  // 抓資料，同步創建新 div
  for(let i=0; i<mrt.data.length; i++){
    let mrts = mrt.data[i];
    // 建新 div
    let itemList = document.createElement("div");
    itemList.className = "item-list";
    itemList.textContent = mrts;
    itemList.onclick = getMRT.bind(null, mrts); // bind 使用！
    // 將 "子 div" 加到對應的 "父 div" 底下
    containerDiv.appendChild(itemList);
  }
});
// 點擊 mrt 搜尋
function getMRT(mrts){
  let input = document.querySelector(".input-search");
  input.value = mrts;
  getKeyword();
}

// Main
// 宣告變數
let nextPage = 0;
// 初始載入 attraction 資料
fetch("/api/attractions")
.then(function(response){
  return response.json();
}).then(function(data){
  nextPage = data.nextPage;
  let frameAttraction = document.querySelector(".frame-attraction");
  // 抓 data 中資料，同步創建新 div
  for (let i=0; i<data.data.length; i++){
    let site = data.data[i];
    createBox(site, frameAttraction);
  }
  // 使用 IntersectionObserver 監聽是否至最底部，完成無限滾動
  let observer = new IntersectionObserver(function(entries){
    let footer = entries[0]; // entries 會回傳一陣列(裝所有被監聽的元素)，因 footer 只有一筆故用 [0]
    if(footer.isIntersecting){ // 若有被觀察到(表出現在視窗中)
      getAttraction(); // 載入新元素
    }
  });
  observer.observe(document.querySelector("#footer")); // 觀察 footer
});
// 隨著網頁下滑載入的更多資料
function getAttraction(){
  let keyword = document.querySelector(".input-search").value; // 獲取值
  let url = `/api/attractions?page=${nextPage}`;
  if(keyword){
    url += `&keyword=${keyword}`;
  }
  if(nextPage !== null){
    fetch(url)
    .then(function(response){
      return response.json();
    }).then(function(data){
      nextPage = data.nextPage; // 更新 nextPage 數字
      let frameAttraction = document.querySelector(".frame-attraction");
      // 抓 data 中資料，同步創建新 div
      for(let i=0; i<data.data.length; i++){
        let site = data.data[i];
        createBox(site, frameAttraction);
      }
    });
  }
}
// 搜尋欄輸入關鍵字載入對應資料
function getKeyword(){
  nextPage = 0; // 重點: nextPage 重新賦值為 0 
  let keyword = document.querySelector(".input-search").value; // 獲取值
  fetch(`/api/attractions?page=${nextPage}&keyword=${keyword}`)
  .then(function(response){
    return response.json();
    }).then(function(data){
      nextPage = data.nextPage; // 更新 nextPage 數字
      let frameAttraction = document.querySelector(".frame-attraction");
      frameAttraction.innerHTML = ""; // 清空現有的 box 元素
      // 抓 data 中資料，同步創建新 div
      for(let i=0; i<data.data.length; i++){
        let site = data.data[i];
        createBox(site, frameAttraction);
      }
      // 移除斷聯再重新接上 IntersectionObserver
    });
  }

function createBox(site, frameAttraction){ // 接收 site 數據 & frameAttraction 容器
  let images = site["images"][0];
  let name = site["name"];
  let mrt = site["mrt"];
  let category = site["category"];
  let id = site["id"];

  // 建新 div
  let box = document.createElement("div");
  box.className = "box";
  let link = document.createElement("a");
  link.href = `/attraction/${id}`;

  let attraction = document.createElement("div");
  attraction.className = "attraction";
  attraction.style.backgroundImage = `url(${images})`;

  let title = document.createElement("div");
  title.className = "title";
  let ellipsis = document.createElement("p");
  ellipsis.className = "ellipsis";
  ellipsis.textContent = name;

  let info = document.createElement("div");
  info.className = "info";
  let mrtDiv = document.createElement("div");
  mrtDiv.className = "mrt";
  mrtDiv.textContent = mrt;
  let categoryDiv = document.createElement("div");
  categoryDiv.className = "category";
  categoryDiv.textContent = category;

  // 將 "子 div" 加到對應的 "父 div" 底下
  info.appendChild(mrtDiv);
  info.appendChild(categoryDiv);
  title.appendChild(ellipsis);
  attraction.appendChild(title);
  attraction.appendChild(info);
  box.appendChild(attraction);
  link.appendChild(box);
  frameAttraction.appendChild(link);
}