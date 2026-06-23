# Training Management Platform ER Diagram

```text
+-----------------------+       +-------------------+       +------------------------+
| Roles                 | 1   * | Users             | 1   1 | Employees              |
+-----------------------+-------+-------------------+-------+------------------------+
| id (UUID) PK          |       | id (UUID) PK      |       | id (UUID) PK           |
| name (String)         |       | email (String)    |       | employee_code (String) |
| description (Text)    |       | hashed_password   |       | user_id (UUID) FK      |
| created_at, updated_at|       | full_name         |       | department_id (UUID) FK|
| ...                   |       | role_id (UUID) FK |       | manager_id (UUID) FK   |
+-----------------------+       | ...               |       | first_name, last_name  |
                                +---------+---------+       | designation, status    |
                                          |                 | ...                    |
                                          |                 +---+------+-------+-----+
                                          |                     |      |       |
                                          | *                   | *    | *     |
+-----------------------+       +---------+---------+           |      |       |
| DigitalSignatures     |       | Notifications     |           |      |       |
+-----------------------+       +-------------------+           |      |       |
| id (UUID) PK          |       | id (UUID) PK      |           |      |       |
| user_id (UUID) FK     |       | user_id (UUID) FK |           |      |       |
| signature_path        |       | title, message    |           |      |       |
| ...                   |       | type, is_read     |           |      |       |
+-----------------------+       +-------------------+           |      |       |
                                                                |      |       |
+-----------------------+---------------------------------------+      |       |
| Departments           |                                              |       |
+-----------------------+                                              |       |
| id (UUID) PK          |                                              |       |
| name, code            | 1                                            | *     | *
| head_id (UUID) FK     |-------------------+                          |       |
| parent_id (UUID) FK   | *                 |                +---------+----+  |
+---+-------------------+                   |                | Achievements |  |
    |                                       |                +--------------+  |
    | 1                                     |                | id (UUID) PK |  |
    | *                                     |          +-----+--------------+  |
+---+---------------+                       |          |                       |
| DepartmentReviews | *                     | 1        | *                     | *
+-------------------+---+       +-----------+----------+----+       +----------+-----------+
| id (UUID) PK          |       | Trainings                 |       | LeaderboardPoints    |
| department_id (UUID)  +-------| id (UUID) PK              |       +----------------------+
| training_id (UUID) FK | *     | title, description        |       | id (UUID) PK         |
| head_id (UUID) FK     |       | status, type              |       | employee_id (UUID)   |
| comments              |       | start_date, end_date      |       | points, reason       |
+-----------------------+       | category_id (UUID) FK     |       +----------------------+
                                | department_id (UUID) FK   |
+-----------------------+   *   | created_by (UUID) FK      |
| TrainingCategories    +-------+ ...                       |
+-----------------------+ 1     +-------------+-------------+
| id (UUID) PK          |                     | 1
| name, description     |                     | *
+-----------------------+       +-------------+-------------+
                                | Enrollments               |
                                +---------------------------+
                                | id (UUID) PK              |
                                | training_id (UUID) FK     |
                                | employee_id (UUID) FK     |
                                | status (Enum)             |
                                | completion_score (Float)  |
                                | ...                       |
                                +------+-------------+------+
                                       | 1           | 1
                                     * |             | 1
                  +--------------------+----+    +---+---------------------+
                  | TrainingAttendance      |    | TrainingEffectiveness   |
                  +-------------------------+    +-------------------------+
                  | id (UUID) PK            |    | id (UUID) PK            |
                  | enrollment_id (UUID) FK |    | enrollment_id (UUID) FK |
                  | session_date            |    | training_id (UUID) FK   |
                  | status, notes           |    | level (Enum)            |
                  +-------------------------+    | score, rating           |
                                                 | ...                     |
                                                 +-------------------------+


+-----------------------+       +-------------------+
| Nominations           |       | AuditLogs         |
+-----------------------+       +-------------------+
| id (UUID) PK          |       | id (UUID) PK      |
| employee_id (UUID) FK |       | user_id (UUID) FK |
| training_id (UUID) FK |       | action, details   |
| status                |       | entity_type       |
| nominated_by (UUID)   |       | ...               |
+-----------------------+       +-------------------+

+-----------------------+
| AnalyticsSnapshots    |
+-----------------------+
| id (UUID) PK          |
| snapshot_date         |
| total_employees       |
| ...                   |
+-----------------------+
```

## SQLAlchemy Relationship Mappings Summary:
- **User ↔ Role**: `Role.users` (One-to-Many) ↔ `User.role`
- **User ↔ Employee**: `User.employee` (One-to-One) ↔ `Employee.user`
- **Employee ↔ Department**: `Department.employees` (One-to-Many) ↔ `Employee.department`
- **Department ↔ DepartmentHead (History)**: `Department.department_heads_history` ↔ `DepartmentHead.department`
- **Training ↔ Category**: `TrainingCategory.trainings` (One-to-Many) ↔ `Training.category`
- **Training ↔ Department**: `Department.trainings` (One-to-Many) ↔ `Training.department`
- **Training ↔ Enrollment**: `Training.enrollments` (One-to-Many) ↔ `Enrollment.training`
- **Employee ↔ Enrollment**: `Employee.enrollments` (One-to-Many) ↔ `Enrollment.employee`
- **Enrollment ↔ Attendance**: `Enrollment.attendance_records` (One-to-Many) ↔ `Attendance.enrollment`
- **Enrollment ↔ Effectiveness**: `Enrollment.effectiveness_evaluation` (One-to-One) ↔ `Effectiveness.enrollment`
- **Training ↔ Effectiveness**: `Training.effectiveness_records` (One-to-Many) ↔ `Effectiveness.training`
- **Training ↔ Nomination**: `Training.nominations` (One-to-Many) ↔ `Nomination.training`
- **User ↔ AuditLog**: `User.audit_logs` (One-to-Many) ↔ `AuditLog.user`
- **User ↔ Notification**: `User.notifications` (One-to-Many) ↔ `Notification.user`
- **User ↔ DigitalSignature**: `User.digital_signatures` (One-to-Many) ↔ `DigitalSignature.user`
- **Employee ↔ Achievement**: `Employee.achievements` (One-to-Many) ↔ `Achievement.employee`
- **Employee ↔ LeaderboardPoint**: `Employee.leaderboard_points` (One-to-Many) ↔ `LeaderboardPoint.employee`
