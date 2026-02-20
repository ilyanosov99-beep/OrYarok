/* students_db_v1.js (demo)
   מטרת הקובץ: לספק מאגר תלמידים דמו אחיד לכל ה-HTMLים, כדי שחיפוש אדמין ימצא תלמידים גם לפני הרשמה.
   הערה: זה דמו בלבד. בהמשך נחליף ל-Firebase.
*/

(function(){
  const DEMO_STUDENTS = [
    {
      tz: '323501510',
      firstName: 'איליה',
      lastName: 'נוסוב',
      fullName: 'איליה נוסוב',
      licenseType: 'A',
      phone: ''
    },
    {
      tz: '222222222',
      firstName: 'דמו',
      lastName: 'תלמיד',
      fullName: 'דמו תלמיד',
      licenseType: 'A2',
      phone: ''
    }
  ];

  function normTz(v){
    const s = String(v ?? '').replace(/\D/g,'');
    return s.length ? s : '';
  }

  const api = {
    getStudents: function(){
      return DEMO_STUDENTS.slice();
    },
    findStudentByTz: function(tz){
      const z = normTz(tz);
      if(!z) return null;
      for(const s of DEMO_STUDENTS){
        if(normTz(s.tz) === z) return Object.assign({}, s);
      }
      return null;
    }
  };

  // Do not clobber an existing StudentsDB if the app already defined one
  if(!window.StudentsDB || typeof window.StudentsDB.getStudents !== 'function'){
    window.StudentsDB = api;
  }

  // Also expose common globals (compat)
  if(!window.STUDENTS_DB) window.STUDENTS_DB = DEMO_STUDENTS;
})();
