let string = "";
for (let i = 0; i < 30; i++) {
  string += ` <div class="card card-body"> Day ${i}:<br> <input type="text" name="day${i}Charge" class="form-control charge"
    placeholder="Enter day ${i} charge"> <br> <input type="text" name="day${i}Payment" class="form-control payment"
    placeholder="Enter day ${i} payment"> </div> <br>`;
}
