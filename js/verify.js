
// console.log($.fn.jquery);

// credit check
let title = $(".activityT.title").text();
let num = "";

if (title.includes("中信")) {
  num = "418230";
} else if (title.includes("富邦")){
  num = "552046";
} else if (title.includes("玉山")){
  num = "524255";
} else {
  num = "";
}

let $agreeItem = $(".promo-desc font");
if (num === "" && $agreeItem) {
  let str = $agreeItem.text();
  console.log(str);
  num = str.replace('「', '').replace('」', '');
}

if ($("input[name=checkCode]").length) {
  chrome.storage.local.get({
    VerifyCode: ""
  }, items => {
    if (num === "" && items.VerifyCode) {
      num = items.VerifyCode;
    }
    console.log("num = " + num);
    $("input[name=checkCode]").val(num).focus();
  });
}

