let chargeList = document.querySelectorAll(".charge");
let paymentList = document.querySelectorAll(".payment");
let dayInput = document.querySelector(".dayInput");
let output = document.querySelector(".output");
let sum = 0;

let btn = document.querySelector("#calcBtn");

btn.addEventListener("click", e => {
  e.preventDefault();
  sum = 0;
  let day = 0;
  let length = dayInput.value;
  if (length > 29) {
    length = 0;
  }
  for (let i = 0; i <= length; i++) {
    if (
      Number.isFinite(Number(chargeList[i].value)) &&
      Number(chargeList[i].value) !== 0
    ) {
      sum += Number(chargeList[i].value);

      if (sum > 1000) {
        day = i;
      }
    }
  }
  for (let i = 0; i <= length; i++) {
    if (
      Number.isFinite(Number(paymentList[i].value)) &&
      Number(paymentList[i].value) !== 0
    ) {
      sum -= Number(paymentList[i].value);
    }
  }

  if (length > 29) {
    output.textContent = "Input a number that is 30 or less";
  } else if (sum > 1000) {
    output.textContent = `You have exceeded your limit on day ${day}`;
  } else {
    output.textContent = `Outstanding balance on day ${length} is $${sum}`;
  }
});
