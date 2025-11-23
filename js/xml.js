let  allMemberNames=[]
        // --- وظائف توليد ملف XML ---

        /**
         * توليد نص XML النهائي من بيانات الفرق الحالية.
         */
        function generateXMLOutput() {
    if (teamsData.length === 0 || teamsData.every(t => t.members.length === 0)) {
        console.error('الرجاء توزيع المتدربين على الفرق أولاً.');
        return;
    }

    let xmlContent = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xmlContent += '<!-- هذا الملف يحمل بيانات الفرق والأعضاء بعد التوزيع اليدوي النهائي -->\n';
    xmlContent += '<teams>\n';

    teamsData.forEach(team => {
        xmlContent += `  <team id="${team.id}" name="${team.name}" teamColor="${team.color}">\n`;
        team.members.forEach(member => {
            xmlContent += `    <member id="${member.id}" name="${member.name}" individualColor="${member.individualColor}"/>\n`;
        });
        xmlContent += '  </team>\n';
    });

    xmlContent += '</teams>';

    // 1️⃣ حفظ على واجهة المستخدم
    const outputContainer = document.getElementById('xmlOutputContainer');
    const outputTextarea = document.getElementById('xmlOutput');
    outputTextarea.value = xmlContent;
    outputContainer.classList.remove('hidden');

    // 2️⃣ تحميل الملف على جهاز المستخدم
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'team_data.xml';
    link.click();
    URL.revokeObjectURL(url);

    // 3️⃣ حفظ البيانات في localStorage لمدة 7 أيام
    const expireDate = new Date();
    expireDate.setDate(expireDate.getDate() + 7);

    const xmlStorage = {
        data: xmlContent,
        expire: expireDate.getTime()
    };

    localStorage.setItem('teamDataXML', JSON.stringify(xmlStorage));

    console.log('تم حفظ البيانات في المتصفح لمدة 7 أيام.');
}

/**
 * لاستدعاء البيانات المحفوظة في أي صفحة:
 */
function loadSavedXML() {
    const stored = localStorage.getItem('teamDataXML');
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    if (new Date().getTime() > parsed.expire) {
        // انتهت صلاحية البيانات
        localStorage.removeItem('teamDataXML');
        return null;
    }
    return parsed.data; // النص الكامل للـ XML
}
        // =================================================================
        //                 منطق المودال (Popup)
        // =================================================================
        
        /**
         * لفتح أو إغلاق نافذة تحميل الملفات.
         */
        function toggleTeamsModal(show) {
            teamFileModal.classList.toggle('hidden', !show);
            if (show) {
                // تصفير الحالة عند الفتح
                document.getElementById('teamFileUploadInput').value = '';
                modalFileStatus.textContent = 'لم يتم اختيار أي ملف.';
                modalFileStatus.classList.remove('bg-red-100', 'bg-green-100', 'text-red-800', 'text-green-800');
                modalFileStatus.classList.add('bg-yellow-100', 'text-yellow-800');
                saveAndCloseBtn.disabled = true;
                TEMP_TEAMS_DATA = null;
            }
        }
        
        /**
         * دالة مساعدة للتحقق من تنسيق لون Hex صحيح.
         */
        function isValidHex(hex) {
            return /^#?([0-9A-F]{3}|[0-9A-F]{6})$/i.test(hex);
        }
        // =================================================================
        //                 منطق معالجة ورفع الملف
        // =================================================================

        /**
         * معالجة ملف XML المرفوع بواسطة المستخدم.
         */
        function handleTeamFileUpload(event) {
            const file = event.target.files[0];
            
            modalFileStatus.classList.remove('bg-red-100', 'bg-green-100', 'text-red-800', 'text-green-800', 'bg-yellow-100', 'text-yellow-800');
            saveAndCloseBtn.disabled = true;
            TEMP_TEAMS_DATA = null;

            if (!file) {
                modalFileStatus.textContent = 'لم يتم اختيار أي ملف.';
                modalFileStatus.classList.add('bg-yellow-100', 'text-yellow-800');
                return;
            }

            modalFileStatus.textContent = `جاري قراءة الملف: ${file.name}...`;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const xmlContent = e.target.result;
                    const result = parseAndValidateXml(xmlContent);

                    if (result.error) {
                        modalFileStatus.textContent = `فشل التحميل: ${result.error}`;
                        modalFileStatus.classList.add('bg-red-100', 'text-red-800');
                        return;
                    }

                    // التحميل والتحقق ناجح
                    TEMP_TEAMS_DATA = result.data;
                    modalFileStatus.textContent = `✅ تم التحقق من ${TEMP_TEAMS_DATA.length} فرق بنجاح! اضغط حفظ لإتمام التغيير.`;
                    modalFileStatus.classList.add('bg-green-100', 'text-green-800');
                    saveAndCloseBtn.disabled = false;

                } catch (error) {
                    console.error("Error during XML processing:", error);
                    modalFileStatus.textContent = "خطأ غير متوقع أثناء معالجة الملف.";
                    modalFileStatus.classList.add('bg-red-100', 'text-red-800');
                }
            };
            
            reader.onerror = () => {
                console.error("Error reading file:", reader.error);
                modalFileStatus.textContent = "خطأ في قراءة الملف.";
                modalFileStatus.classList.add('bg-red-100', 'text-red-800');
            };

            reader.readAsText(file);
        }

       // =================================================================
        //                 منطق التحليل والتحقق من XML
        // =================================================================

        /**
         * تحليل ملف XML والتحقق من هيكل الفرق.
         * (لا تغيير على هذا الجزء - فهو يعمل بشكل مستقل)
         */
        function parseAndValidateXml(xmlString) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(xmlString, "application/xml");
            const errorNode = xmlDoc.querySelector('parsererror');
            if (errorNode) return { error: "خطأ في تحليل ملف XML: تأكد من أن الهيكل صحيح." };
            
            const teamsNode = xmlDoc.querySelector('teams');
            if (!teamsNode) return { error: "خطأ: عنصر الجذر يجب أن يكون <teams>." };

            const teams = [];
            const teamNodes = teamsNode.querySelectorAll('team');

            if (teamNodes.length === 0) return { error: "لم يتم العثور على أي فرق في الملف." };

            for (const teamNode of teamNodes) {
                const teamId = teamNode.getAttribute('id');
                const teamName = teamNode.getAttribute('name');
                const teamColor = teamNode.getAttribute('teamColor');
                const members = [];
                
                if (!teamName || !teamColor || !isValidHex(teamColor)) continue; 

                const memberNodes = teamNode.querySelectorAll('member');

                for (const memberNode of memberNodes) {
                    const memberId = memberNode.getAttribute('id');
                    const memberName = memberNode.getAttribute('name');
                    const memberIndividualColor = memberNode.getAttribute('individualColor');
                    
                    if (!memberName || !memberIndividualColor || !isValidHex(memberIndividualColor)) continue;
                    
                    members.push({ id: memberId, name: memberName, individualColor: memberIndividualColor });
                }

                if (members.length > 0) {
                     teams.push({ id: teamId || crypto.randomUUID(), teamName, teamColor, members });
                }
            }
            if (teams.length === 0) {
                 return { error: "لم يتم العثور على فرق صالحة (يجب أن تحتوي على أعضاء وألوان صحيحة)." };
            }

            return { data: teams };
        }
		function showAll(){
			if (!TEMP_TEAMS_DATA) {
				alertUser("الرجاء اختيار ملف صحيح أولاً.");
				return;
			}
			let allMemberNames=getMembersList()
			setTextareaNames()
			//عدد الفرق
			const numberOfTeams = TEMP_TEAMS_DATA.length;
			document.getElementById('numTeams').value = numberOfTeams;
			teamsData = TEMP_TEAMS_DATA.map(team => ({
    id: team.id,
    name: team.teamName,   // استخدم الاسم من XML كما هو
    color: team.teamColor, // اللون من XML كما هو
    members: team.members.map(m => ({
        id: m.id,
        name: m.name,
        individualColor: m.individualColor // لون العضو من XML كما هو
    }))
}));

// عرض الفرق كما هي
renderTeams();
		}
		function getMembersList(){
			if (!TEMP_TEAMS_DATA) {
				alertUser("الرجاء اختيار ملف صحيح أولاً.");
				return;
			}
			allMemberNames = TEMP_TEAMS_DATA.flatMap(team => team.members.map(m => m.name));
		}
		function setTextareaNames(){
			const allMemberNames = TEMP_TEAMS_DATA.flatMap(team => team.members.map(m => m.name));

			// تحويل المصفوفة إلى نص، كل اسم في سطر جديد
			const namesText = allMemberNames.join('\n');

			// تعيين النص لقيمة textarea
			document.getElementById('traineeNames').value = namesText;
		}
        