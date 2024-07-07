// 獲取訂單編號
let queryParam = window.location.search;
let orderNumber = queryParam.split("=").pop(); 
let orderNumberDiv = document.getElementById("orderNumber");
orderNumberDiv.textContent = orderNumber;