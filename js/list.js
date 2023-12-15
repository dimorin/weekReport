/**
 * 리스트 만들기 위한 클래스
 * @param {*} option {}객체
 * listWrapper : 만들어진 리스트르르 담는 상위 element 선택자, default : ".table_body_wrap"
 * navWrapper : 네비게이션을 담는 상위 element 선택자, default : ".table_footer_wrap"
 * searchWrapper : 검색 조건을 담는 상위 element 선택자, default : ".search_wrap"
 * url : 필수, api url
 * polling : 데이터 폴링 여부, default : false
 * pollTime : 폴링 타임. second, default : 10
 * method : method, default : POST
 * type : data type, default : json
 * makeTemplate : 필수, 각 한줄의 리스트 만드는 함수. parmeter :_data(json data)
 */
function CustomList(option) {
    this.option = option;
    this.page = 1;
    this.size = 10;
    this.totalPage = 0;
    this.loading = option.loading;
    this.searchWrapper = option.searchWrapper ? option.searchWrapper : ".search_wrap";
    this.listWrapper = option.listWrapper ? option.listWrapper : ".table_body_wrap";
    this.navWrapper = option.navWrapper ? option.navWrapper : ".table_footer_wrap";
    this.searchBase = document.querySelector(this.searchWrapper);
    this.listBase = document.querySelector(this.listWrapper);
    this.navBase = document.querySelector(this.navWrapper);
    this.method = option.method ? option.method : "POST";
    this.type = option.type ? option.type : "json";
    this.contentType = option.contentType ? option.contentType : "application/json";
    this.url = option.url;
    this.polling = option.polling != undefined && option.polling != null ? option.polling : false;
    this.pollingTime = option.pollingTime;
    this.pause = false; //데이터 요청 시 polling을 stop하기 위한 변수, polling == true && pause == false 일때 polling
    this.searchSelector = option.searchSelector ? option.searchSelector : {
        orderKey: ["order_key", "orderKey", ""] //order key를 찾기 위한 선택자
        , orderVal: ["order_type", "orderType", ""]//order value를 찾기 위한 선택자
        , pageNum: ["page_num", "currPage", "1"] //order value를 찾기 위한 선택자
        , pageSize: ["page_size", "perPage", "10"] //order value를 찾기 위한 선택자
    };
    //템플릿 생성 함수, _data : ajax 리턴 데이터
    this.makeTemplate = option.makeTemplate;
    //select box 내용 변경에 따른 이벤트 중복 방지
    this.prevSelectProceeding = false;
    this.totalCnt = 0;

    _this = this;

    //리스트 초기화 함수 (input hidden 초기화, 이벤트 바인딩)
    this.init = function () {
        // input hidden element 만들거나  초기화 (페이지번호, 페이지사이즈, 정렬 키, 정렬 타입)
        // 추후 : input hidden을 동적으로 만들지 말고 미리 만들어놓자. 모든 리스트에서 필수로 있어야 할 항목이기 때문. 가독성을 위해서도.
        for (let key in _this.searchSelector) {
            let item = _this.searchSelector[key];
            let itemEl = _this.searchBase.querySelector(`.${item[0]}`);

            if (!itemEl) {
                itemEl = document.createElement("input");
                itemEl.type = "hidden";
                itemEl.classList.add(item[0]);
                _this.searchBase.appendChild(itemEl);
            }
            itemEl.name = item[1];
            itemEl.value = item[2];
        }

        _this.initPage();

        // ①이벤트 바인딩 : 필터링
        $(_this.searchWrapper + " .tunnel_date").on("change", function () {
            _this.controlInitBtn();
            _this.initPage();
        });
        $(_this.searchWrapper + " input[type=radio]").on("click", function () {
            _this.controlInitBtn();
            _this.initPage();
        });
        $(_this.searchWrapper + " select").on("change", function (e) {
            _this.controlInitBtn();
            _this.eventSelectChanged(e);
        });

        // ②이벤트 바인딩 : 검색
        $(_this.searchWrapper + " .btn_search").on("click", function () {
            _this.controlInitBtn();
            _this.initPage();
        });
        $(_this.searchWrapper + " input.search").keydown(function (key) {
            if (key.keyCode == 13) {
                _this.controlInitBtn();
                _this.initPage();
            }
        });
        $(_this.searchWrapper + " input.search").on("focusin", function (key) {
            _this.pause = true;
        });
        $(_this.searchWrapper + " input.search").on("focusout", function (key) {
            _this.pause = false;
        });

        // ③이벤트 바인딩 : 정렬
        $(_this.listWrapper + " .arrow-sort").on("click", _this.eventSetOrder);
        $(_this.listWrapper + " .arrow-sort").prev().on("click", _this.eventSetOrder);

        // ④이벤트 바인딩 : 네비게이션
        $(_this.navWrapper + " .btn_page").on("click", _this.eventNavigation);

        // ⑤이벤트 바인딩 : 한 페이지에 몇개씩 보여줄 것인가
        $(_this.navWrapper + " select.page_num").on("change", function (_e) {
            let size = parseInt(_e.currentTarget.value);
            _this.setPageSize(size);
            _this.initPage();
        });

        //polling
        _this.pollList();
    }

    //polling
    this.pollList = function () {
        setTimeout(function () {
            if (_this.polling && !_this.pause)
                _this.refresh();
            _this.pollList();
        }, _this.pollingTime)
    }

    //refresh
    this.refresh = function (type) {
        if (type == 'delete') {
            _this.setPagination(_this.totalCnt - 1);
        }
        _this.pause = true;
        let param = _this.makeParam();
        _this.getData(param);
    }

    //파라미터 serializing
    this.makeParam = function () {
        let que = {};
        //선택 되어야 할 자식 노드들, 추가가 필요한 Node의 selector 추가 사용
        let childrenEls = _this.searchBase.querySelectorAll("input[type=radio]:checked, input[type=checkbox]:checked, input[type=text], input[type=hidden], select");
        //각 노드를 돌면서 name이 있는 경우에만 que에 push
        childrenEls.forEach(function (item, currentIndex, listObj) {
            if (item.name == '') {
                return;
            }
            if (item.value == '') {
                return;
            }
            // que.push(item.name + "=" + encodeURIComponent(item.value));
            if (item.name == 'startDate') {
                que[item.name] = item.value + " 00:00:00";
            } else if (item.name == 'endDate') {
                que[item.name] = item.value + " 23:59:59";
            } else {
                que[item.name] = item.value;
            }

        });
        //parameter string 변환 $(form).serialize()
        // var param = que.join('&'); 
        let param = JSON.stringify(que);
        return param;
    }

    //get data by ajax
    this.getData = function (_param) {
        if (_this.loading) _this.loading.show();
        $.ajax({
            url: _this.url,
            type: _this.method,
            dataType: _this.type,
            data: _param,
            contentType: _this.contentType,
            success: function (data) {
                _this.makeList(data);
                _this.pause = false;
                _this.successData = data;

            },
            error: function (data) {
                console.log(data);
                _this.pause = false;
            },
            complete: function () {
                if (_this.loading) _this.loading.hide();
            }
        });
    }

    //리스트 생성
    this.makeList = function (_data) {
        let template = "";
        if (_data.result == undefined || _data.result) {
            template = _this.makeTemplate(_data);
        } else {
            //경고
            alert("조회 실패\n지속적으로 문제시 관리자에게 문의하세요");
        }
        if (template == "") {
            let columnLength = $(_this.listBase).find("thead th").length;
            template = `<tr>
    						<td colspan="${columnLength}" style="border-bottom:none;position:absolute;transform:translate(-50%,-200%);left:50%;top:50%;text-align:center;">
    							<img src="/ss/resources/img/data-default.png" style="width:60%;">
    						</td>
    					 </tr>`
        }
        _this.totalCnt = _data.totalCnt;
        _this.listBase.querySelector("tbody").innerHTML = template;
        _this.navBase.querySelector(".total_wrap .total").textContent = _data.totalCnt != null ? _data.totalCnt : 0;
        _this.setPagination(_data.totalCnt);
    }

    this.setPagination = function (totalCnt) {
        if (totalCnt) {
            _this.totalPage = (parseInt(totalCnt % _this.size) > 0) ? parseInt(totalCnt / _this.size) + 1 : parseInt(totalCnt / _this.size);
            _this.totalPage = _this.totalPage == 0 ? 0 : _this.totalPage;
            _this.page = _this.page > _this.totalPage ? _this.totalPage : _this.page;
            if (_this.page == 1 && _this.totalPage == 1) {
                $('.btn_page[data-type=prev]').prop('disabled', true);
                $('.btn_page[data-type=next]').prop('disabled', true);
            } else {
                $('.btn_page[data-type=prev]').prop('disabled', false);
                $('.btn_page[data-type=next]').prop('disabled', false);
            }
        } else {
            _this.totalPage = 1;
            _this.page = 1;
            $('.btn_page[data-type=prev]').prop('disabled', true);
            $('.btn_page[data-type=next]').prop('disabled', true);
        }
        this.setPageNum(_this.page);
        _this.navBase.querySelector(".current_page").textContent = _this.page;
        _this.navBase.querySelector(".total_page").textContent = _this.totalPage;
        // _this.page 가 1 이면 .btn_page[data-type=first] 가 비활성
        // _this.page 가 _this.totalPage 이면 .btn_page[data-type=last]가 비활성
        if (_this.page == 1) {
            $('.btn_page[data-type=first]').prop('disabled', true);
        } else {
            $('.btn_page[data-type=first]').prop('disabled', false);
        }
        if (_this.page == _this.totalPage) {
            $('.btn_page[data-type=last]').prop('disabled', true);
        } else {
            $('.btn_page[data-type=last]').prop('disabled', false);
        }
    }

    // ① 필터링 select onchanged
    this.eventSelectChanged = function (_e) {
        if (_this.prevSelectProceeding) {
            return;
        }
        let el = $(_e.currentTarget);
        let target = el.data("target");

        if (target != null && target != "" && target != "sectionFilter") {  // 터널
            let paramVal = el.val();
            let prefixVal = el.data("prefix-val");
            let prefixStr = el.data("prefix-str");
            //select box 내용 변경에 따른 이벤트 중복 방지
            _this.prevSelectProceeding = true;
            let template = `<option value="${prefixVal}">${prefixStr}</option>`;
            document.getElementById(target).value = "";
            if (paramVal == "") {
                document.getElementById(target).innerHTML = template;

                _this.prevSelectProceeding = false;
            } else {
                let url = el.data("url");
                let param = {};
                let paramKey = el.data("key");
                param[paramKey] = paramVal;
                $.ajax({
                    url: url,
                    type: "POST",
                    dataType: "json",
                    data: JSON.stringify(param),
                    contentType: _this.contentType,
                    success: function (data) {
                        let list = data.sectionList;
                        for (let i = 0; i < list.length; i++) {
                            let item = list[i];
                            template += `<option value="${item.sectionKey}">${item.sectionName}</option>`
                        }
                        document.getElementById(target).innerHTML = template;
                        _this.prevSelectProceeding = false;
                    },
                    error: function (data) {
                        //에러 처리
                        console.log(data);
                        _this.prevSelectProceeding = false;
                    }
                });
            }
            //_this.setPageNum(1);
            //_this.refresh();
            _this.initPage();
        } else if (target != null && target != "" && target == "sectionFilter") {   // 구간
            //터널 선택에 따른 구간 표시
            let tunnelKey = el.val();
            let template = `<option value="">구간</option>`;
            //
            for (let i = 0; i < sectionList.length; i++) {
                let item = sectionList[i];
                if (tunnelKey == "" || item.tunnelKey == tunnelKey) {
                    template += `<option value="${item.sectionKey}">${item.sectionName}</option>`
                }
            }
            document.getElementById(target).innerHTML = template;
            _this.prevSelectProceeding = false;
            //_this.setPageNum(1);
            //_this.refresh();
            _this.initPage();
        } else {
            //_this.setPageNum(1);
            //_this.refresh();
            _this.initPage();
        }
    }

    // ③정렬
    this.eventSetOrder = function (_e) {
        let arrowOrder = ['combo', 'down', 'up'];
        let el;
        if (_e.currentTarget.tagName == 'SPAN') {
            el = $(_e.currentTarget).next('.arrow-sort');
        } else if (_e.currentTarget.tagName == 'BUTTON') {
            el = $(_e.currentTarget);
        }

        //이전값
        let order = parseInt(el.attr("order"));
        //변경값
        let currentOrder = ++order >= arrowOrder.length ? 0 : order;
        el.find("div").attr('class', arrowOrder[currentOrder]);
        //다른 정렬 항목 초기화
        el.parents("th").siblings().find(".arrow-sort").attr("order", 0).find("div").attr("class", "combo");
        el.attr('order', currentOrder);
        let orderKey;
        let orderVal;
        switch (currentOrder) {
            case 0:
                orderKey = "";
                orderVal = "";
                break;
            case 1:
                orderKey = el.data("order");
                orderVal = "DESC";
                break;
            case 2:
                orderKey = el.data("order");
                orderVal = "ASC";
                break;
        }
        _this.setOrder(orderKey, orderVal);
        _this.initPage();
    }
    this.setOrder = function (orderKey, orderVal) {
        var orderKeyEl = _this.searchBase.querySelector(`.${_this.searchSelector.orderKey[0]}`);
        var orderValEl = _this.searchBase.querySelector(`.${_this.searchSelector.orderVal[0]}`);

        orderKeyEl.value = orderKey;
        orderValEl.value = orderVal;
    }

    // ④네비게이션
    this.eventNavigation = function (_e) {
        let el = $(_e.currentTarget);
        let type = el.data("type");
        let changePage = 0;

        switch (type) {
            case "prev":
                changePage = _this.page - 1;
                changePage = changePage <= 0 ? 1 : changePage;
                break;
            case "first":
                changePage = 1;
                break;
            case "next":
                changePage = _this.page + 1;
                changePage = changePage > _this.totalPage ? _this.totalPage : changePage;
                break;
            case "last":
                changePage = _this.totalPage;
                break;
            default:
                break;
        }
        _this.setPageNum(changePage);
        _this.refresh();
    }
    //페이지 넘버 세팅
    this.setPageNum = function (page) {
        _this.page = page;
        _this.searchBase.querySelector(`.${_this.searchSelector.pageNum[0]}`).value = page;
    }

    // ⑤한 페이지에 몇개씩 보여줄 것인가
    this.setPageSize = function (size) {
        _this.size = size;
        _this.searchBase.querySelector(`.${_this.searchSelector.pageSize[0]}`).value = size;
    }



    this.successData = {};
    this.getContent = function () {
        return _this.successData;
    }
    this.pollingControl = function (pollingState) {
        _this.pause = !pollingState;
    }







    this.initPage = function () {
        _this.setPageNum(1);
        _this.refresh();
    }
    this.controlInitBtn = function () { // 초기화 버튼을 보이거나 감추기
        let today;
        let endDate;
        let accessLogStartDate_init_value;
        let accessLogEndDate_init_value;
        let accessLogStartDate_value;
        let accessLogEndDate_value;

        let isChange = false;
        let btn_init = _this.searchBase.querySelector('.btn_init');
        let isAccessLogPage = _this.searchBase.classList.contains('accessLog');
        if (isAccessLogPage) {
            today = new Date();
            endDate = formatLongToDateString(today, "yyyy-mm-dd");
            accessLogStartDate_init_value = formatLongToDateString(today.setDate(today.getDate() - 6), "yyyy-mm-dd");
            accessLogEndDate_init_value = endDate;
            accessLogStartDate_value = null;
            accessLogEndDate_value = null;
        }

        let childrenEls = _this.searchBase.querySelectorAll("input[type=radio]:checked, input[type=checkbox]:checked, input[type=text], input[type=hidden], select");
        childrenEls.forEach(function (item, currentIndex, listObj) {
            if (item.name == '' || item.name == 'currPage' || item.name == 'perPage') {
                return;
            }

            if (!isAccessLogPage && item.name == 'assetType' && item.value == 'P') {
                return;
            }

            if (isAccessLogPage && item.name == 'startDate') {
                accessLogStartDate_value = item.value;
                return; // 출입로그 시작일이거나 출입로그 종료일이면 isChange 값 변화시키지 않는다.
            }
            if (isAccessLogPage && item.name == 'endDate') {
                accessLogEndDate_value = item.value;
                return; // 출입로그 시작일이거나 출입로그 종료일이면 isChange 값 변화시키지 않는다.
            }

            if (item.value != '') {
                isChange = true;
            }
        });

        if (isChange) { // 변화가 있으면 초기화 버튼 보이기    		
            if (btn_init.classList.contains('invisible')) {
                btn_init.classList.remove('invisible');
            }
            btn_init.classList.add('visible');
        } else {	// 변화가 없으면 초기화 버튼 감추기    		
            if (!isAccessLogPage) { // 출입로그 페이지가 아니면 isChange가 false 일때 초기화 감추기
                if (btn_init.classList.contains('visible')) {
                    btn_init.classList.remove('visible');
                }
                btn_init.classList.add('invisible');
            } else {// 출입로그 페이지인데, 출입로그 시작일 값과 출입로그 종료일 값이 초기값과 같으면 초기화 버튼 감추기 다르면 초기화 버튼 보이기
                if (accessLogStartDate_value == accessLogStartDate_init_value && accessLogEndDate_value == accessLogEndDate_init_value) {
                    if (btn_init.classList.contains('visible')) {
                        btn_init.classList.remove('visible');
                    }
                    btn_init.classList.add('invisible');
                } else {
                    if (btn_init.classList.contains('invisible')) {
                        btn_init.classList.remove('invisible');
                    }
                    btn_init.classList.add('visible');
                }
            }
        }
    }

    return this;
}

// 각 리스트마다 템플릿이 다르므로 CustomList에 넣지 않는다.
function makeTempalte(_data) {
    let list = _data.sensorList;
    let totalCnt = _data.totalCnt;
    var _listTemplate = "";
    for (var i = 0; i < list.length; i++) {
        let item = list[i];
        let modelStr, manufacturerStr, ipStr, portStr, tunnelNameStr, sectionNameStr;

        modelStr = item.model ? item.model : '-';
        manufacturerStr = item.manufacturer ? item.manufacturer : '-';
        ipStr = item.ip ? item.ip : '-';
        portStr = item.port ? item.port : '-';
        tunnelNameStr = item.tunnelName ? item.tunnelName : '-';
        sectionNameStr = item.sectionName ? item.sectionName : '-';

        let jsonStr = JSON.stringify(item);
        jsonStr = jsonStr.replaceAll("\"", "'");

        let _template =
            `<tr class="asset_${item.environmentKey}" data-idx="${item.environmentKey}">
	        <td class="text-center"><span class="ellipsis" style="width:230px;" title="${modelStr}">${modelStr}</span></td>
	        <td class="text-center"><span class="ellipsis" style="width:230px;" title="${manufacturerStr}">${manufacturerStr}</span></td>
	        <td class="text-center">${ipStr}</td>
	        <td class="text-center">${portStr}</td>
	        <td class="text-center"><span class="ellipsis" style="width:230px;" title="${tunnelNameStr}">${tunnelNameStr}</span></td>
	        <td class="text-center"><span class="ellipsis" style="width:231px;" title="${sectionNameStr}">${sectionNameStr}</span></td>
	        <td class="text-center"><button class="btn_icon edit" title="수정" onclick="editItem(${jsonStr})"><span class="material-symbols-outlined">edit_square</span></button></td>
	        <td class="text-center"><button class="btn_icon delete" title="삭제" onclick="deleteItem(${jsonStr})"><span class="material-symbols-outlined">delete</span></button></td>
	        </tr>`;
        _listTemplate += _template;
    }
    return _listTemplate;
}

// CustomList 인스턴스 생성
var option = {
    loading: loading_spinner
    , listWrapper: '.table_body_wrap'
    , navWrapper: '.table_footer_wrap'
    , searchWrapper: '.search_wrap'
    , url: '/ss/device/getList'
    , polling: false
    , pollingTime: config.admin_gapPolling
    , method: 'POST'
    , type: 'json'
    , makeTemplate: makeTempalte
}
var list;
list = new CustomList(option);
list.init();