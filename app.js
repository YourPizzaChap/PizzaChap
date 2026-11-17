const toast=document.getElementById("toast");
let toastTimer;
const cart=[];
const products={
  margherita:{name:"Маргарита",emoji:"🍅"},
  vegetarian:{name:"Вегетаріанська",emoji:"🫑"},
  mushroom:{name:"Грибна",emoji:"🍄"}
};
const money=value=>new Intl.NumberFormat("uk-UA").format(value)+" ₴";
function notify(message){
  toast.textContent=message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>toast.classList.remove("show"),2600);
}
function selectedVariant(card){
  const option=card.querySelector(".size-option.active");
  return {size:Number(option.dataset.size),price:Number(option.dataset.price),weight:Number(option.dataset.weight)};
}
function cartCount(){return cart.reduce((sum,item)=>sum+item.qty,0)}
function calculateCart(){
  const totalBefore=cart.reduce((sum,item)=>sum+item.price*item.qty,0);
  const eligible=[];
  cart.forEach((item,index)=>{
    if(item.size===40) for(let i=0;i<item.qty;i++) eligible.push({index,price:item.price});
  });
  eligible.sort((a,b)=>a.price-b.price);
  const discounted=new Map();
  let discount=0;
  for(let i=0;i+1<eligible.length;i+=2){
    const item=eligible[i];
    discounted.set(item.index,(discounted.get(item.index)||0)+item.price*0.5);
    discount+=item.price*0.5;
  }
  return {total:Math.round(totalBefore-discount),totalBefore,discount,discounted};
}
function renderCart(){
  const count=cartCount();
  document.getElementById("cartCount").textContent=count;
  document.getElementById("cartItemCount").textContent=count;
  const content=document.getElementById("cartContent");
  const summary=document.getElementById("cartSummary");
  const form=document.getElementById("checkoutForm");
  if(!cart.length){
    content.innerHTML='<div class="empty-cart"><span>🍕</span><h3>Тут поки порожньо</h3><p>Обери піцу з меню — і вона з’явиться тут.</p><button class="btn btn-primary" type="button" data-close-cart>До меню ↗</button></div>';
    summary.hidden=true;
    form.hidden=true;
    return;
  }
  const totals=calculateCart();
  content.innerHTML=cart.map((item,index)=>{
    const lineBase=item.price*item.qty;
    const lineDiscount=totals.discounted.get(index)||0;
    return '<div class="cart-line"><div class="cart-thumb">'+products[item.id].emoji+'</div><div><h4>'+products[item.id].name+'</h4><p>'+item.size+' см · '+item.weight+' г · '+money(item.price)+'</p><div class="quantity-control"><button type="button" data-qty="-1" data-index="'+index+'" aria-label="Зменшити кількість">−</button><span>'+item.qty+'</span><button type="button" data-qty="1" data-index="'+index+'" aria-label="Збільшити кількість">＋</button></div></div><div class="cart-line-price">'+money(lineBase-lineDiscount)+(lineDiscount?'<small class="discount-line">−'+money(lineDiscount)+'</small>':'')+'<button class="remove-line" type="button" data-remove="'+index+'">Видалити</button></div></div>';
  }).join("");
  if(totals.discount){
    content.insertAdjacentHTML("beforeend",'<div class="cart-promo-note">🎉 Знижка 50% на кожну другу піцу 40 см: <strong>−'+money(totals.discount)+'</strong></div>');
  }
  document.getElementById("cartTotal").textContent=money(totals.total);
  document.getElementById("checkoutTotal").textContent=money(totals.total);
  summary.hidden=false;
  if(!form.hidden) summary.hidden=true;
}
function openCart(){
  renderCart();
  document.getElementById("cartOverlay").hidden=false;
  document.body.classList.add("modal-open");
}
function closeCart(){
  document.getElementById("cartOverlay").hidden=true;
  document.body.classList.remove("modal-open");
}
document.getElementById("cartBtn").addEventListener("click",openCart);
document.getElementById("langBtn").addEventListener("click",()=>notify("Основна мова PizzaChap — українська."));
document.getElementById("menuToggle").addEventListener("click",()=>document.getElementById("nav").classList.toggle("open"));
document.querySelectorAll(".nav a").forEach(link=>link.addEventListener("click",()=>document.getElementById("nav").classList.remove("open")));
document.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener("click",event=>{
  const target=document.querySelector(link.getAttribute("href"));
  if(target){event.preventDefault();target.scrollIntoView({behavior:"smooth"});}
}));
document.querySelectorAll(".size-picker").forEach(group=>{
  group.addEventListener("click",event=>{
    const option=event.target.closest(".size-option");
    if(!option)return;
    group.querySelectorAll(".size-option").forEach(button=>button.classList.toggle("active",button===option));
    const card=group.closest(".product-card");
    card.querySelector(".product-price").textContent=money(Number(option.dataset.price));
  });
});
document.querySelectorAll(".product-card .add-btn").forEach(button=>{
  button.addEventListener("click",()=>{
    const card=button.closest(".product-card");
    const variant=selectedVariant(card);
    const id=card.dataset.product;
    const existing=cart.find(item=>item.id===id&&item.size===variant.size);
    if(existing)existing.qty+=1;
    else cart.push({id,...variant,qty:1});
    renderCart();
    notify(products[id].name+" додано до кошика 🍕");
    button.innerHTML="Додано ✓";
    setTimeout(()=>button.innerHTML='У кошик <span>＋</span>',1000);
  });
});
document.querySelectorAll(".favorite-btn").forEach(button=>{
  button.addEventListener("click",()=>{
    const active=button.getAttribute("aria-pressed")==="true";
    button.setAttribute("aria-pressed",String(!active));
    button.textContent=active?"♡":"♥";
    notify(active?"Видалено з обраного":"Додано до обраного ♥");
  });
});
document.getElementById("cartContent").addEventListener("click",event=>{
  if(event.target.closest("[data-close-cart]")){closeCart();return;}
  const qtyButton=event.target.closest("[data-qty]");
  const removeButton=event.target.closest("[data-remove]");
  if(qtyButton){
    const index=Number(qtyButton.dataset.index);
    cart[index].qty+=Number(qtyButton.dataset.qty);
    if(cart[index].qty<=0)cart.splice(index,1);
    renderCart();
  }
  if(removeButton){
    cart.splice(Number(removeButton.dataset.remove),1);
    renderCart();
  }
});
document.querySelectorAll("[data-close-cart]").forEach(button=>button.addEventListener("click",closeCart));
document.getElementById("cartOverlay").addEventListener("click",event=>{
  if(event.target.id==="cartOverlay")closeCart();
});
document.getElementById("checkoutBtn").addEventListener("click",()=>{
  document.getElementById("cartSummary").hidden=true;
  document.getElementById("checkoutForm").hidden=false;
  document.getElementById("cartTitle").textContent="Оформлення";
});
document.getElementById("backToCart").addEventListener("click",()=>{
  document.getElementById("checkoutForm").hidden=true;
  document.getElementById("cartSummary").hidden=false;
  document.getElementById("cartTitle").innerHTML='Кошик <span id="cartItemCount">'+cartCount()+'</span>';
});
document.getElementById("checkoutForm").addEventListener("submit",event=>{
  event.preventDefault();
  if(!cart.length)return;
  const data=new FormData(event.currentTarget);
  const name=String(data.get("customerName")).trim();
  const address=String(data.get("address")).trim();
  const total=calculateCart().total;
  document.getElementById("successMessage").textContent="Дякуємо, "+name+"! Тестове замовлення на "+money(total)+" для адреси «"+address+"» успішно пройшло перевірку. Реальне замовлення поки не створюється.";
  document.getElementById("cartOverlay").hidden=true;
  document.getElementById("successOverlay").hidden=false;
  cart.splice(0,cart.length);
  renderCart();
});
document.getElementById("finishDemo").addEventListener("click",()=>{
  document.getElementById("successOverlay").hidden=true;
  document.getElementById("checkoutForm").reset();
  document.getElementById("cartTitle").innerHTML='Кошик <span id="cartItemCount">0</span>';
  document.body.classList.remove("modal-open");
  window.scrollTo({top:document.getElementById("menu").offsetTop-30,behavior:"smooth"});
});
document.addEventListener("keydown",event=>{
  if(event.key==="Escape"){
    closeCart();
    document.getElementById("successOverlay").hidden=true;
    document.body.classList.remove("modal-open");
  }
});
