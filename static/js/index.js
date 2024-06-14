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
  if(width >= 600 && width <= 1199){
    return 450;
  }else if(width <= 599){
    return 200;
  }else{
    return 1050;
  }
}
// 載入 mrt 資料
fetch("http://127.0.0.1:8000/api/mrts")
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
  let input = document.querySelector(".input");
  input.value = mrts;
  getKeyword();
}

// Main
let nextPage = 0;
let observer;
// 初始載入 attraction 資料
fetch("http://127.0.0.1:8000/api/attractions")
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
  observer = new IntersectionObserver(function(entries){
    let footer = entries[0]; // entries 會回傳一陣列(裝所有被監聽的元素)，因 footer 只有一筆故用 [0]
    if(footer.isIntersecting){ // 若有被觀察到(表出現在視窗中)
      getAttraction(); // 載入新元素
    }
  });
  observer.observe(document.querySelector(".footer")); // 觀察 footer
});

function getAttraction(){
  let keyword = document.querySelector(".input").value; // 獲取值
  let url = `http://127.0.0.1:8000/api/attractions?page=${nextPage}`;
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

function getKeyword(){
  nextPage = 0;
  console.log(nextPage);
  let keyword = document.querySelector(".input").value; // 獲取值
  fetch(`http://127.0.0.1:8000/api/attractions?page=${nextPage}&keyword=${keyword}`)
  .then(function(response){
    return response.json();
    }).then(function(data){
      nextPage = data.nextPage; // 更新 nextPage 數字
      console.log(nextPage);
      let frameAttraction = document.querySelector(".frame-attraction");
      frameAttraction.innerHTML = ""; // 清空現有的 box 元素
      // 抓 data 中資料，同步創建新 div
      for(let i=0; i<data.data.length; i++){
        let site = data.data[i];
        createBox(site, frameAttraction);
      }
      observer.disconnect();
      observer.observe(document.querySelector(".footer"));
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
  link.href = `http://127.0.0.1:8000/attraction/${id}`;

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