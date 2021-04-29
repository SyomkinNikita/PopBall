const start_game = () => {
    const field = document.getElementById('game');
    field.innerText = '';
    game.stop();
    game.run();
}

const stopped_game = () => {
    game.stop();
}

class Start_Game {
    constructor() {
        // Время
        this.timer = document.getElementById('content__timer');
        // Счёт
        this.score_field = document.getElementById('content__score');
        // Очки
        this.losses_field = document.getElementById('content__losses')
        this.field = document.getElementById('game');
        this.MS = 50;
    }

    create_ball() {
        let ms = get_number(1000 + this.time, 2000 + this.time * this.time);
        clearTimeout(this.timer_ball_creation_id);
        this.timer_ball_creation_id = setTimeout(this.create_ball.bind(this), ms);
        this.total_balls_number++;
        let height = this.field.clientHeight;
        let width = this.field.clientWidth;
        let ball = new Ball(width, height, this.total_balls_number);
        this.field.appendChild(ball.ball);
        this.balls.push(ball);
    }

    create_wind() {
        // Задаем следующий вызов и создание ветра через  случайное время
        let ms = get_number(1000, 10000);
        clearTimeout(this.timer_wind_creation_id);
        this.timer_wind_creation_id = setTimeout(this.create_wind.bind(this), ms);
        // Создаем ветер
        this.wind.create();
    }

    move() {
        for (let i = 0; i < this.balls.length; i++) {
            // Учитываем ветер
            let [a, v] = this.wind.get();
            this.balls[i].influence(a, v);
            // Перемещаем шарик
            let is_inside = this.balls[i].move(this.MS / 1000);
            // Проверяем, пересекаются ли шарик и иголки
            let is_intersection = false;
            if (is_inside && this.needle) {
                let [x_left, x_right, y] = this.needle.get_xy();
                is_intersection = this.balls[i].check_intersection(x_left, x_right, y);
                if (is_intersection) {
                    // Шарик пересекается с иглой
                    this.score += 1;
                    this.score_field.innerHTML = this.score;
                }
            }
            if (!is_inside || is_intersection) {
                // Если шарик наткнулся на иголку
                let ball = this.balls.splice(i, 1)[0];
                document.getElementById(ball.ball.id).remove();
                this.losses += 1;
                this.losses_field.innerHTML = this.losses;
            }
        }
        this.wind.set_to_zero();
        if (this.balls.length === 0 && this.time <= 0) {
            clearInterval(this.timer_motion_id);
            this.field.innerHTML =
                `<h2>Лопнутые ${this.score}</h2>` +
                `<h2>Всего ${this.losses}</h2>`;
        }
    }

    run() {
        this.time = 10;
        this.timer_id = setInterval(this.run_time.bind(this), 1000);
        let height = this.field.clientHeight;
        let width = this.field.clientWidth;
        this.needle = new Needle(width, height);
        this.field.appendChild(this.needle.needle);
        this.wind = new Wind();
        this.timer_wind_creation_id = setTimeout(this.create_wind.bind(this), 100);
        // Создание шариков
        this.timer_ball_creation_id = setTimeout(this.create_ball.bind(this), 100);
        // Счет
        this.score = 0;
        this.score_field.innerHTML = this.score;
        this.losses = 0;
        this.losses_field.innerText = this.losses;
        // Массив для шариков и полное количество шариков
        this.balls = [];
        this.total_balls_number = 0;
        // Запускаем процесс движения
        this.timer_motion_id = setInterval(this.move.bind(this), this.MS);
    }

    run_time() {
        this.time -= 1;
        this.timer.innerText = this.time;
        // Если в игре прошло больше 60 сек, то останавливаем игру
        if (this.time <= 0) {
            clearInterval(this.timer_id);
            clearTimeout(this.timer_ball_creation_id);
            this.needle.remove();
            this.needle = null;
        }
    }

    stop() {
        if (this.timer_id) {
            clearInterval(this.timer_id);
            clearTimeout(this.timer_ball_creation_id);
            clearTimeout(this.timer_motion_id);
        }
    }
}

class Ball {
    constructor(x_max, y_max, id) {
        this.ball = document.createElement('div');
        this.ball.classList.add('ball');
        this.ball.id = id;
        // Определяем цвет
        this.ball.style.backgroundColor = get_color();
        // Размеры шарика
        this.r = get_number(20, 100);
        this.ball.style.height = `${2 * this.r}px`;
        this.ball.style.width = `${2 * this.r}px`;
        this.x_max = x_max;
        this.y_max = y_max;
        this.x = get_number(this.r, x_max - 2 * this.r);
        this.y = this.r;
        this.set_position(this.x, this.y);
        this.v_x = 0;
        this.v_y = get_number(50, 100);
    }

    // проверка нахождения шара в поле
    check_inside() {
        if (0 > this.x - this.r || this.x + this.r > this.x_max)
            return false;
        if (0 > this.y - this.r || this.y + this.r > this.y_max)
            return false;
        return true;
    }

    // пересечение иголки и шара
    check_intersection(x_left, x_right, y) {
        if (this.y > y &&
            ((this.x - this.r <= x_left && x_left < this.x + this.r) ||
                (this.x - this.r <= x_right && x_right < this.x + this.r)))
            return true;
        else if (this.check_point_inside(x_left, y) ||
            this.check_point_inside(x_right, y))
            return true;
        return false;
    }

    check_point_inside(x, y) {
        let r = Math.pow(x - this.x, 2) + Math.pow(y - this.y, 2);
        if (Math.pow(this.r, 2) >= r)
            return true;
        return false;
    }

    // учитывание ветра
    influence(a, v) {
        if (v < 1)
            return;
        // Ветер есть
        const K = 0.001;
        let x = 0;
        if (a > 90)
            x = this.x_max;
        this.v_x += Math.exp(-K * Math.abs(this.x - x)) * v * Math.cos(a * Math.PI / 180);
        this.v_y += Math.exp(-K * Math.abs(this.x - x)) * v * Math.sin(a * Math.PI / 180);
    }

    // движение шара
    move(ms) {
        let x_new = this.x + this.v_x * ms;
        if (0 <= x_new - this.r && x_new + this.r < this.x_max)
            this.x = x_new;
        this.y += this.v_y * ms;
        this.set_position(this.x, this.y);
        return this.check_inside();
    }

    // pos шарика
    set_position(x, y) {
        this.ball.style.bottom = `${this.y - this.r}px`;
        this.ball.style.left = `${this.x - this.r}px`;
    }
}

class Needle {
    constructor(x_max, y_max) {
        this.needle = document.createElement('div');
        this.needle.classList.add('needle');
        document.addEventListener('keydown', this.move.bind(this));
        this.h = 100;
        this.w = 1;
        this.needle.style.height = `${this.h}px`;
        this.needle.style.width = `${this.w}px`;
        this.x_max = x_max;
        this.y_max = y_max;
        this.x = x_max / 2;
        this.y = y_max - 2 * this.h / 3;
        this.set_position(this.x, this.y);
    }

    // Координаты
    get_xy() {
        return [this.x - this.w / 2, this.x + this.w / 2, this.y];
    }

   // Перемещение уголки
    move(e) {
        let DX = 20;
        if (e.key === 'ArrowLeft')
            this.x -= DX;
        else if (e.key === 'ArrowRight')
            this.x += DX;
        this.set_position(this.x, this.y);
    }

    remove() {
        document.getElementsByClassName('needle')[0].remove();
    }


    // Положение иголки
    set_position(x, y) {
        this.needle.style.bottom = `${this.y}px`;
        this.needle.style.left = `${this.x - this.w / 2}px`;
    }

}

// Класс Ветер
class Wind {
    constructor() {
        this.a = 0; // угол
        this.v = 0; // скорость
    }

    // Добавляем ветер
    create() {
        // Скорость
        this.v = get_number(10, 100);
        // Направление
        this.a = get_number(0, 180);
    }

    get() {
        return [this.a, this.v];
    }

    set_to_zero() {
        this.a = 0;
        this.v = 0;
    }
}

function get_color() {
    let color = '#';
    // Определяем оттенки для трех цветов
    for (let i = 0; i < 3; i++) {
        let c = Math.round(get_number(0, 255));
        let c_hex = Number(c).toString(16);
        color += c_hex;
    }
    return color;
}

function get_number(min, max) {
    return Math.random() * (max - min) + min;
}

const game = new Start_Game();
