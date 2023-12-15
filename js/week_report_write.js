var week_report_write = {
    add_type: function (element) {
        console.log("add type")

        var template = `
        <section class="section type">
            <div class="section_title">
            <button class="btn_delete mr-5px" onclick="remove_section(this)"><span class="material-symbols-outlined fill icon">do_not_disturb_on</span></button>
            <span class="label mr-5px">구분</span>
            <div class="input" contenteditable="true">당기과제</div>
            </div>
            <button class="btn_add dept" onclick="week_report_write.add_dept(this)"><span class="material-symbols-outlined fill icon">add_circle</span><span class="d-inline-block ml-5px">본부목표 추가</span></button>
        </section>
        `;
        $(element).before(template);

    },
    add_dept: function (element) {
        console.log("add dept")

        var template = `
        <section class="section dept">
            <div class="section_title">
                <button class="btn_delete mr-5px" onclick="remove_section(this)"><span class="material-symbols-outlined fill icon">do_not_disturb_on</span></button>
                <span class="label mr-5px">본부목표</span>
                <div class="input" contenteditable="true">매출 130억 달성</div>
            </div>
            <button class="btn_add subject" onclick="week_report_write.add_subject(this)">
                <div class="inner">
                <span class="material-symbols-outlined fill icon">add_circle</span><span class="d-inline-block ml-5px">전략과제 추가</span>
                </div>
            </button>
        </section>
        `;
        $(element).before(template);

    },
    add_subject: function (element) {
        console.log("add subject")
        var random = Math.floor(Math.random() * 100);
        var status_id = 'status_' + random;
        var template = `
        <section class="section subject">
            <div class="section_title">
                <button class="btn_delete mr-5px" onclick="remove_section(this)"><span class="material-symbols-outlined fill icon">do_not_disturb_on</span></button>
                <span class="label mr-5px">전략과제</span>
                <div class="input" contenteditable="true">기존 고객사 지속 사업 수정</div>
                <span class="label ml-10px mr-5px">상태</span>
                <select class="fms_select status" name="" id="${status_id}">
                    <option>선택하세요</option>
                    <option value="">양호</option>
                    <option value="">위험</option>
                </select>
            </div>
            <table class="table_action">
                <colgroup>
                    <col width="750">
                    <col width="110">
                    <col width="110">
                    <col width="750">
                </colgroup>
                <thead>
                    <tr>
                        <th>실행계획</th>
                        <th>종료예정일</th>
                        <th>진행률</th>
                        <th>Action/Issue</th>
                    </tr>
                </thead>
                <tbody class="action">
                </tbody>
            </table>
            <button class="btn_add action" onclick="week_report_write.add_action(this)">
                <div class="inner">
                <span class="material-symbols-outlined fill icon">add_circle</span><span class="d-inline-block ml-5px">실행계획 추가</span>
                </div>
            </button>
        </section>
        `;
        $(element).before(template);
        $('#' + status_id).select2({ //상태
            width: '100',
            minimumResultsForSearch: Infinity
        });
    },
    add_action: function (element) {
        var random = new Date().getTime();
        var finish_date_id = 'finish_date_' + random;
        var wrapper_finish_date_id = 'wrapper_finish_date_' + random;
        console.log(finish_date_id, wrapper_finish_date_id);
        var template = `
        <tr class="section action">
            <td class="table_action_td">
            <div class="input_wrap">
                <button class="btn_delete mr-10px" onclick="remove_section(this)"><span class="material-symbols-outlined fill icon">do_not_disturb_on</span></button>
                <div class="input" contenteditable="true"></div>
            </div>
            </td>
            <td class="table_action_td">
            <div class="date_wrap">
                <input type="text" class="finish_date" id="${finish_date_id}" autocomplete="off" readonly>
                <div class="wrapper_finish_date" id="${wrapper_finish_date_id}"></div>
            </div>
            </td>
            <td class="table_action_td">
            <div class="input_wrap">
                <div class="input" contenteditable="true"></div>
                <span class="d-inline-block ml-5px">%</span>
            </div>
            </td>
            <td class="table_action_td">
            <div class="input_wrap">
                <div class="input" contenteditable="true"></div>
            </div>
            </td>
        </tr>
        `;
        $(element).prev('.table_action').find('tbody.action').append(template);


        new tui.DatePicker('#' + wrapper_finish_date_id, { //종료예정일
            date: new Date(),
            input: {
                element: '#' + finish_date_id,
                format: 'yyyy-MM-dd'
            },
            language: 'ko'
        });
    },
}