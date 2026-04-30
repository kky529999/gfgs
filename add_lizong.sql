-- 添加李总（总经理）账号

-- 1. 先查看或创建综合管理部
INSERT INTO departments (name, code)
VALUES ('综合管理部', 'admin')
ON CONFLICT DO NOTHING;

-- 2. 获取综合管理部ID
DO $$
DECLARE
  dept_id UUID;
  pwd_hash TEXT;
BEGIN
  -- 生成密码哈希 (默认密码: ChangeMe123!)
  pwd_hash := crypt('ChangeMe123!', gen_salt('bf'));

  -- 获取综合管理部ID
  SELECT id INTO dept_id FROM departments WHERE code = 'admin' LIMIT 1;

  -- 如果部门不存在，设置为 NULL
  IF dept_id IS NULL THEN
    RAISE NOTICE 'Department admin not found, setting department_id to NULL';
  END IF;

  -- 3. 创建李总账号
  -- 注意：需要手动设置 role 字段为 'gm'
  INSERT INTO employees (
    name,
    phone,
    title,
    department_id,
    password_hash,
    is_active,
    must_change_password
  )
  VALUES (
    '李总',
    '17729581562',
    '总经理',
    dept_id,
    pwd_hash,
    true,
    true
  )
  ON CONFLICT (phone) DO UPDATE
  SET name = EXCLUDED.name,
      title = EXCLUDED.title,
      department_id = EXCLUDED.department_id,
      password_hash = EXCLUDED.password_hash,
      is_active = EXCLUDED.is_active,
      must_change_password = EXCLUDED.must_change_password;

  RAISE NOTICE '李总账号创建成功！';
END $$;

-- 4. 查询刚创建的员工
SELECT id, name, phone, title, is_active FROM employees WHERE phone = '17729581562';
