/** Course catalog item (professor style). */
function Course(code, name, credits, maxStudents, preparatoryCourse, enrolled) {
  this.code = code;
  this.name = name;
  this.credits = credits;
  this.maxStudents = maxStudents;
  this.preparatoryCourse = preparatoryCourse;
  this.incompatible = [];
  this.enrolled = enrolled === undefined ? 0 : enrolled;
}

/** Logged-in student (professor style). */
function Student(studentId, email, name, surname, planType) {
  this.studentId = studentId;
  this.email = email;
  this.name = name;
  this.surname = surname;
  this.planType = planType;
}

/** Saved study plan for the logged-in student. */
function StudyPlan(planId, planType, courses, totalCredits, minCredits, maxCredits) {
  this.planId = planId;
  this.planType = planType;
  this.courses = courses;
  this.totalCredits = totalCredits;
  this.minCredits = minCredits;
  this.maxCredits = maxCredits;
}

export { Course, Student, StudyPlan };
